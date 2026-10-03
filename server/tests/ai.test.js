const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, fakeGemini } = require('./helpers');
const { sanitizeGenerated } = require('../src/routes/ai');

const AI_ENV = { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-test' };

const tutorBody = {
  concept: { name: 'Fraction Operations', learningObjective: 'Add fractions with unlike denominators.' },
  question: { question: 'Solve 1/2 + 1/3.', options: ['2/5', '2/6', '5/6', '1/5'], correctAnswer: '5/6' },
  selectedAnswer: '2/5',
  misconception: { title: 'Combining Denominators', explanation: 'You added the denominators.' },
  reasoning: 'I added the tops and the bottoms.',
  history: [{ role: 'tutor', text: 'What was your first step?' }],
  message: 'I added 1+1 and 2+3.',
};

const generated = {
  questions: [
    {
      question: 'Solve 1/4 + 1/2.',
      options: ['3/4', '2/6', '2/4', '1/8'],
      correctAnswer: '3/4',
      hint: 'Rename 1/2 in quarters.',
      solutionSteps: '1/2 = 2/4, so 1/4 + 2/4 = 3/4.',
      distractors: [
        { option: '2/6', misconceptionTitle: 'Adding denominators', misconceptionExplanation: 'You added the denominators.' },
        { option: 'not-an-option', misconceptionTitle: 'Bogus', misconceptionExplanation: 'x' },
      ],
    },
    { question: 'Broken', options: ['a', 'b'], correctAnswer: 'c', hint: '', solutionSteps: '', distractors: [] },
  ],
};

describe('AI endpoints', () => {
  const servers = [];
  after(() => Promise.all(servers.map((server) => server.close())));
  const start = async (env, deps) => {
    const server = await startServer(env, deps);
    servers.push(server);
    return server;
  };

  test('return 503 when AI is not configured', async () => {
    const server = await start();
    const { status, json } = await server.request('POST', '/api/ai/tutor', { body: tutorBody });
    assert.equal(status, 503);
    assert.equal(json.error.code, 'ai_disabled');
  });

  test('tutor sends the key in a header, wraps learner text as data, and alternates turns', async () => {
    const gemini = fakeGemini(() => 'What size are the pieces in each fraction?');
    const server = await start(AI_ENV, gemini);
    const { status, json } = await server.request('POST', '/api/ai/tutor', { body: tutorBody });
    assert.equal(status, 200);
    assert.equal(json.reply, 'What size are the pieces in each fraction?');

    const [call] = gemini.calls;
    assert.ok(call.url.endsWith('/models/gemini-test:generateContent'));
    assert.ok(!call.url.includes('test-key'), 'the API key must not be in the URL');
    assert.equal(call.headers['x-goog-api-key'], 'test-key');
    assert.match(call.body.systemInstruction.parts[0].text, /<data>/);
    const roles = call.body.contents.map((content) => content.role);
    assert.deepEqual(roles, ['user', 'model', 'user']);
  });

  test('validates request bodies', async () => {
    const server = await start(AI_ENV, fakeGemini(() => 'unused'));
    const { status, json } = await server.request('POST', '/api/ai/tutor', { body: { ...tutorBody, message: '', history: 'nope' } });
    assert.equal(status, 400);
    const fields = json.error.details.map((detail) => detail.field);
    assert.ok(fields.includes('message'));
    assert.ok(fields.includes('history'));
  });

  test('explain returns the model text', async () => {
    const server = await start(AI_ENV, fakeGemini(() => '### Overview\nFractions compare parts of a whole.'));
    const { status, json } = await server.request('POST', '/api/ai/explain', {
      body: {
        concept: { name: 'Basic Fractions', subject: 'Mathematics', description: '', learningObjective: '', keyPoints: ['Equal parts'] },
        misconceptions: [{ title: 'Denominator Ignored', description: 'Counts parts only.' }],
        notes: '',
      },
    });
    assert.equal(status, 200);
    assert.match(json.explanation, /Overview/);
  });

  test('question generation requests JSON output and drops invalid items', async () => {
    const gemini = fakeGemini(() => JSON.stringify(generated));
    const server = await start(AI_ENV, gemini);
    const { status, json } = await server.request('POST', '/api/ai/questions', {
      body: { concept: { name: 'Fraction Operations', subject: 'Mathematics', description: '', learningObjective: '' }, count: 2, difficulty: 'easy', sourceText: '' },
    });
    assert.equal(status, 200);
    assert.equal(json.questions.length, 1);
    assert.equal(json.questions[0].difficulty, 'easy');
    assert.deepEqual(json.questions[0].distractors, [
      { option: '2/6', misconception: { title: 'Adding denominators', explanation: 'You added the denominators.' } },
    ]);
    assert.equal(gemini.calls[0].body.generationConfig.responseMimeType, 'application/json');
  });

  test('reports unusable model output as a 502', async () => {
    const server = await start(AI_ENV, fakeGemini(() => 'not json at all'));
    const { status, json } = await server.request('POST', '/api/ai/questions', {
      body: { concept: { name: 'Topic' }, count: 1, difficulty: 'medium', sourceText: '' },
    });
    assert.equal(status, 502);
    assert.equal(json.error.code, 'ai_invalid_output');
  });

  test('maps upstream failures to safe errors', async () => {
    const server = await start(AI_ENV, fakeGemini(() => new Response('{"error":"boom"}', { status: 500 })));
    const { status, json } = await server.request('POST', '/api/ai/tutor', { body: tutorBody });
    assert.equal(status, 502);
    assert.equal(json.error.code, 'ai_upstream_error');
    assert.ok(!JSON.stringify(json).includes('boom'));
  });

  test('rate limits AI requests per client', async () => {
    const server = await start({ ...AI_ENV, AI_RATE_LIMIT_MAX: '2' }, fakeGemini(() => 'Hint.'));
    assert.equal((await server.request('POST', '/api/ai/tutor', { body: tutorBody })).status, 200);
    assert.equal((await server.request('POST', '/api/ai/tutor', { body: tutorBody })).status, 200);
    const limited = await server.request('POST', '/api/ai/tutor', { body: tutorBody });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
});

test('sanitizeGenerated rejects duplicate options and missing answers', () => {
  const raw = JSON.stringify({
    questions: [
      { question: 'Pick one', options: ['A', 'a', 'B', 'C'], correctAnswer: 'A', distractors: [] },
      { question: 'Pick one', options: ['A', 'B', 'C', 'D'], correctAnswer: 'E', distractors: [] },
    ],
  });
  assert.deepEqual(sanitizeGenerated(raw, 'easy'), []);
});

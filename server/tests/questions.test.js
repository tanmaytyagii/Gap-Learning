const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('./helpers');

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'shared', 'question-bank.json'), 'utf8'));

const validQuestion = {
  concept: 'frac_equiv',
  difficulty: 'medium',
  question: 'Which fraction is equivalent to 2/5?',
  options: ['4/10', '4/7', '2/10', '5/2'],
  correctAnswer: '4/10',
  hint: 'Scale both terms by the same factor.',
  solutionSteps: 'Multiply the numerator and denominator by 2.',
  misconceptionMap: { '4/7': 'additive_scaling_error', '5/2': 'numerator_denominator_reversal' },
};

describe('platform', () => {
  let server;
  before(async () => { server = await startServer(); });
  after(() => server.close());

  test('health reports status, question count, and AI availability', async () => {
    const { status, json } = await server.request('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(json.status, 'ok');
    assert.equal(json.questions, seed.length);
    assert.deepEqual(json.ai, { enabled: false, model: null });
  });

  test('sets security headers and hides the framework', async () => {
    const { headers } = await server.request('GET', '/api/health');
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.equal(headers.get('x-powered-by'), null);
    assert.equal(headers.get('access-control-allow-origin'), null);
  });

  test('unknown API routes return JSON 404s', async () => {
    const { status, json } = await server.request('GET', '/api/nope');
    assert.equal(status, 404);
    assert.equal(json.error.code, 'not_found');
  });

  test('malformed JSON returns a JSON 400 without a stack trace', async () => {
    const { status, json, text } = await server.request('POST', '/api/ai/tutor', { raw: '{not json' });
    assert.equal(status, 400);
    assert.equal(json.error.code, 'invalid_json');
    assert.ok(!text.includes('at '), 'response must not include a stack trace');
  });
});

describe('question bank (read)', () => {
  let server;
  before(async () => { server = await startServer(); });
  after(() => server.close());

  test('lists the seed bank and filters it', async () => {
    const all = await server.request('GET', '/api/questions');
    assert.equal(all.json.total, seed.length);

    const byConcept = await server.request('GET', '/api/questions?concept=frac_equiv&difficulty=hard');
    assert.ok(byConcept.json.questions.length > 0);
    assert.ok(byConcept.json.questions.every((q) => q.concept === 'frac_equiv' && q.difficulty === 'hard'));

    const bySubject = await server.request('GET', '/api/questions?subject=english');
    assert.ok(bySubject.json.questions.every((q) => q.concept.startsWith('eng_')));
  });

  test('rejects an invalid difficulty filter', async () => {
    const { status } = await server.request('GET', '/api/questions?difficulty=impossible');
    assert.equal(status, 400);
  });

  test('gets one question or 404s', async () => {
    const found = await server.request('GET', `/api/questions/${seed[0].id}`);
    assert.equal(found.json.question.id, seed[0].id);
    const missing = await server.request('GET', '/api/questions/does-not-exist');
    assert.equal(missing.status, 404);
  });

  test('writes are disabled without ADMIN_TOKEN', async () => {
    const { status, json } = await server.request('POST', '/api/questions', { body: validQuestion });
    assert.equal(status, 403);
    assert.equal(json.error.code, 'authoring_disabled');
  });
});

describe('question bank (authoring)', () => {
  const auth = { Authorization: 'Bearer test-admin-token' };
  let server;
  before(async () => { server = await startServer({ ADMIN_TOKEN: 'test-admin-token' }); });
  after(() => server.close());

  test('requires the right token', async () => {
    assert.equal((await server.request('POST', '/api/questions', { body: validQuestion })).status, 401);
    assert.equal((await server.request('POST', '/api/questions', { body: validQuestion, headers: { Authorization: 'Bearer wrong' } })).status, 401);
  });

  test('validates questions field by field', async () => {
    const { status, json } = await server.request('POST', '/api/questions', {
      headers: auth,
      body: {
        ...validQuestion,
        concept: 'frac_basic',
        options: ['1', '1'],
        correctAnswer: '3',
        misconceptionMap: { 1: 'made_up' },
      },
    });
    assert.equal(status, 400);
    const fields = json.error.details.map((detail) => detail.field);
    assert.ok(fields.includes('concept'));
    assert.ok(fields.includes('options'));
    assert.ok(fields.includes('correctAnswer'));
  });

  test('creates, updates, and deletes questions and persists them', async () => {
    const created = await server.request('POST', '/api/questions', { headers: auth, body: { ...validQuestion, id: 'client-chosen' } });
    assert.equal(created.status, 201);
    const { id } = created.json.question;
    assert.match(id, /^frac_equiv-/);
    assert.equal(created.json.question.learningObjective.length > 0, true);

    const overlay = JSON.parse(fs.readFileSync(path.join(server.dataDir, 'questions.json'), 'utf8'));
    assert.equal(overlay.questions[0].id, id);

    const updated = await server.request('PUT', `/api/questions/${id}`, { headers: auth, body: { ...validQuestion, difficulty: 'hard' } });
    assert.equal(updated.json.question.difficulty, 'hard');

    const removed = await server.request('DELETE', `/api/questions/${id}`, { headers: auth });
    assert.equal(removed.status, 204);
    assert.equal((await server.request('GET', `/api/questions/${id}`)).status, 404);
  });

  test('can edit and delete seed questions through the overlay', async () => {
    const target = seed[1];
    const edited = await server.request('PUT', `/api/questions/${target.id}`, {
      headers: auth,
      body: { ...target, hint: 'A clearer hint.' },
    });
    assert.equal(edited.json.question.hint, 'A clearer hint.');
    assert.equal((await server.request('GET', `/api/questions/${target.id}`)).json.question.hint, 'A clearer hint.');

    await server.request('DELETE', `/api/questions/${target.id}`, { headers: auth });
    const health = await server.request('GET', '/api/health');
    assert.equal(health.json.questions, seed.length - 1);
  });
});

// Deterministic stand-in for the Gemini REST API, injected into the real Express app through
// createApp's `fetchImpl` hook. No network access and no API key are involved.

const json = (text) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});

const TUTOR_REPLY = 'What size are the pieces in each fraction before you combine them?';

const EXPLANATION = [
  '### Overview',
  'Equivalent fractions name the **same amount** with different numbers.',
  '',
  '### Where it goes wrong',
  '- Adding the same number to the top and bottom changes the value.',
  '',
  '### Self-check',
  '1. Is 2/3 equal to 4/6? **Yes**',
].join('\n');

const GENERATED = {
  questions: [
    {
      question: 'Which fraction is equivalent to 2/3?',
      options: ['4/6', '3/4', '4/5', '2/6'],
      correctAnswer: '4/6',
      hint: 'Scale the numerator and denominator by the same number.',
      solutionSteps: 'Multiply the numerator and denominator by 2 to get 4/6.',
      distractors: [
        { option: '3/4', misconceptionTitle: 'Additive Scaling', misconceptionExplanation: 'You added 1 to both terms.' },
        { option: '2/6', misconceptionTitle: 'Stub: denominator only', misconceptionExplanation: 'You only scaled the denominator.' },
      ],
    },
    {
      // Deliberately duplicates a curated question so the client-side duplicate check is exercised.
      question: 'Which fraction is equivalent to 1/2?',
      options: ['2/3', '2/4', '3/4', '1/4'],
      correctAnswer: '2/4',
      hint: '',
      solutionSteps: '',
      distractors: [],
    },
  ],
};

async function geminiStub(url, init) {
  const body = JSON.parse(init.body);
  const system = body.systemInstruction.parts[0].text;
  if (system.includes('Socratic tutor')) return json(TUTOR_REPLY);
  if (system.includes('personalized explanation')) return json(EXPLANATION);
  if (system.includes('multiple-choice practice questions')) return json(JSON.stringify(GENERATED));
  return new Response('{"error":"unexpected prompt"}', { status: 500 });
}

module.exports = { geminiStub, TUTOR_REPLY };

const express = require('express');
const { HttpError } = require('../lib/errors');
const { rules, validate } = require('../lib/input');
const { explainPrompt, questionsPrompt, tutorPrompt } = require('../lib/prompts');
const { rateLimit } = require('../lib/rateLimit');
const { DIFFICULTIES } = require('../lib/validation');

const { string, integer, oneOf, array, object } = rules;

const tutorSchema = object({
  concept: object({ name: string({ max: 120, required: true }), learningObjective: string({ max: 300 }) }),
  question: object({
    question: string({ max: 600, required: true }),
    options: array(string({ max: 200, required: true }), { min: 2, max: 6 }),
    correctAnswer: string({ max: 200, required: true }),
  }),
  selectedAnswer: string({ max: 200, required: true }),
  misconception: object({ title: string({ max: 120 }), explanation: string({ max: 600 }) }, { nullable: true }),
  reasoning: string({ max: 1000 }),
  history: array(object({ role: oneOf(['learner', 'tutor']), text: string({ max: 1000, required: true }) }), { max: 20 }),
  message: string({ min: 1, max: 1000, required: true }),
});

const explainSchema = object({
  concept: object({
    name: string({ max: 120, required: true }),
    subject: string({ max: 80 }),
    description: string({ max: 600 }),
    learningObjective: string({ max: 300 }),
    keyPoints: array(string({ max: 300 }), { max: 8 }),
  }),
  misconceptions: array(object({ title: string({ max: 120, required: true }), description: string({ max: 600 }) }), { max: 6 }),
  notes: string({ max: 4000 }),
});

const questionsSchema = object({
  concept: object({
    name: string({ max: 120, required: true }),
    subject: string({ max: 80 }),
    description: string({ max: 600 }),
    learningObjective: string({ max: 300 }),
  }),
  count: integer({ min: 1, max: 5 }),
  difficulty: oneOf(DIFFICULTIES),
  sourceText: string({ max: 6000 }),
});

const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Model output is untrusted too: keep only questions that are complete, have four distinct
 * options, and whose answer is one of them.
 */
function sanitizeGenerated(raw, difficulty) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const items = Array.isArray(parsed?.questions) ? parsed.questions : [];
  return items.flatMap((item) => {
    const question = clean(item?.question, 500);
    const options = Array.isArray(item?.options) ? item.options.map((option) => clean(option, 200)).filter(Boolean) : [];
    const correctAnswer = clean(item?.correctAnswer, 200);
    const unique = new Set(options.map((option) => option.toLowerCase())).size === options.length;
    if (question.length < 5 || options.length !== 4 || !unique || !options.includes(correctAnswer)) return [];
    const seen = new Set();
    const distractors = (Array.isArray(item.distractors) ? item.distractors : []).flatMap((distractor) => {
      const option = clean(distractor?.option, 200);
      const title = clean(distractor?.misconceptionTitle, 120);
      const explanation = clean(distractor?.misconceptionExplanation, 600);
      if (!options.includes(option) || option === correctAnswer || seen.has(option) || !title) return [];
      seen.add(option);
      return [{ option, misconception: { title, explanation } }];
    });
    return [{
      question,
      options,
      correctAnswer,
      hint: clean(item.hint, 300),
      solutionSteps: clean(item.solutionSteps, 1000),
      difficulty,
      distractors,
    }];
  });
}

function aiRouter({ gemini, rateLimitConfig }) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!gemini) {
      return next(new HttpError(503, 'ai_disabled', 'AI features are not configured on this server.'));
    }
    return next();
  });
  router.use(rateLimit(rateLimitConfig));

  router.post('/tutor', async (req, res) => {
    const input = validate(tutorSchema, req.body);
    const reply = await gemini.generate(tutorPrompt(input));
    res.json({ reply });
  });

  router.post('/explain', async (req, res) => {
    const input = validate(explainSchema, req.body);
    const explanation = await gemini.generate(explainPrompt(input));
    res.json({ explanation });
  });

  router.post('/questions', async (req, res) => {
    const input = validate(questionsSchema, req.body);
    const questions = sanitizeGenerated(await gemini.generate(questionsPrompt(input)), input.difficulty).slice(0, input.count);
    if (questions.length === 0) {
      throw new HttpError(502, 'ai_invalid_output', 'The AI service did not return usable questions. Try again.');
    }
    res.json({ questions });
  });

  return router;
}

module.exports = { aiRouter, sanitizeGenerated };

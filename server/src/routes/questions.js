const express = require('express');
const { createHash, timingSafeEqual } = require('node:crypto');
const { HttpError } = require('../lib/errors');
const { validateQuestionInput, DIFFICULTIES } = require('../lib/validation');

const digest = (value) => createHash('sha256').update(value).digest();

/** Write access needs ADMIN_TOKEN; without it authoring is switched off entirely. */
function requireAdmin(adminToken) {
  return (req, res, next) => {
    if (!adminToken) {
      return next(new HttpError(403, 'authoring_disabled', 'Question authoring is disabled on this server. Set ADMIN_TOKEN to enable it.'));
    }
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    // Compare fixed-length digests so the check takes the same time for any input.
    if (!token || !timingSafeEqual(digest(token), digest(adminToken))) {
      return next(new HttpError(401, 'unauthorized', 'A valid admin token is required.'));
    }
    return next();
  };
}

function questionsRouter({ store, curriculum, adminToken }) {
  const router = express.Router();
  const admin = requireAdmin(adminToken);

  router.get('/', (req, res) => {
    const { concept, subject, difficulty } = req.query;
    if (difficulty !== undefined && !DIFFICULTIES.includes(difficulty)) {
      throw new HttpError(400, 'invalid_request', `difficulty must be one of: ${DIFFICULTIES.join(', ')}.`);
    }
    const questions = store.list({
      concept: typeof concept === 'string' ? concept : undefined,
      subject: typeof subject === 'string' ? subject : undefined,
      difficulty,
    });
    res.json({ questions, total: questions.length });
  });

  router.get('/:id', (req, res) => {
    const question = store.get(req.params.id);
    if (!question) throw new HttpError(404, 'not_found', 'Question not found.');
    res.json({ question });
  });

  router.post('/', admin, async (req, res) => {
    const { value, errors } = validateQuestionInput(req.body, curriculum);
    if (errors) throw new HttpError(400, 'invalid_question', 'The question is invalid.', errors);
    res.status(201).json({ question: await store.create(value) });
  });

  router.put('/:id', admin, async (req, res) => {
    const { value, errors } = validateQuestionInput(req.body, curriculum);
    if (errors) throw new HttpError(400, 'invalid_question', 'The question is invalid.', errors);
    const question = await store.update(req.params.id, value);
    if (!question) throw new HttpError(404, 'not_found', 'Question not found.');
    res.json({ question });
  });

  router.delete('/:id', admin, async (req, res) => {
    if (!(await store.remove(req.params.id))) throw new HttpError(404, 'not_found', 'Question not found.');
    res.status(204).end();
  });

  return router;
}

module.exports = { questionsRouter };

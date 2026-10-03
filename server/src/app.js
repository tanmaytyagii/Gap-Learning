const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { loadCurriculum } = require('./lib/curriculum');
const { errorHandler, notFound } = require('./lib/errors');
const { createGeminiClient } = require('./lib/gemini');
const { QuestionStore } = require('./lib/questionStore');
const { aiRouter } = require('./routes/ai');
const { questionsRouter } = require('./routes/questions');
const { version } = require('../package.json');

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
}

/**
 * Builds the Express app. Dependencies can be injected (for example a stub `fetch` for Gemini),
 * which is how the tests exercise every route without network access.
 */
async function createApp(config, { fetchImpl } = {}) {
  const curriculum = loadCurriculum(config.curriculumFile);
  const store = await new QuestionStore({
    seedFile: config.seedFile,
    overlayFile: path.join(config.dataDir, 'questions.json'),
    curriculum,
  }).init();
  const gemini = config.gemini.apiKey ? createGeminiClient(config.gemini, fetchImpl) : null;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(securityHeaders);
  if (config.corsOrigins.length > 0) {
    app.use('/api', cors({ origin: config.corsOrigins }));
  }
  app.use('/api', express.json({ limit: '64kb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version,
      questions: store.all().length,
      ai: { enabled: Boolean(gemini), model: gemini ? gemini.model : null },
    });
  });
  app.use('/api/questions', questionsRouter({ store, curriculum, adminToken: config.adminToken }));
  app.use('/api/ai', aiRouter({ gemini, rateLimitConfig: config.aiRateLimit }));
  app.use('/api', notFound);

  const indexFile = config.clientDist && path.join(config.clientDist, 'index.html');
  if (indexFile && fs.existsSync(indexFile)) {
    app.use('/assets', express.static(path.join(config.clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(config.clientDist, { index: false }));
    // Client-side routes all resolve to the SPA shell.
    app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
      res.set({ 'Cache-Control': 'no-cache', 'Content-Security-Policy': CONTENT_SECURITY_POLICY });
      res.sendFile(indexFile);
    });
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

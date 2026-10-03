const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads all configuration from the environment. See .env.example for documentation. */
function loadConfig(env = process.env) {
  return {
    env: env.NODE_ENV || 'development',
    port: positiveNumber(env.PORT, 8787),
    dataDir: path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data')),
    seedFile: path.join(ROOT, 'shared', 'question-bank.json'),
    curriculumFile: path.join(ROOT, 'shared', 'curriculum.json'),
    // Serve the built frontend when it exists, so one process can host the whole app.
    clientDist: env.CLIENT_DIST === 'false' ? null : path.resolve(env.CLIENT_DIST || path.join(ROOT, 'dist')),
    corsOrigins: (env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
    trustProxy: env.TRUST_PROXY ? positiveNumber(env.TRUST_PROXY, 1) : false,
    adminToken: env.ADMIN_TOKEN || null,
    gemini: {
      apiKey: env.GEMINI_API_KEY || null,
      model: env.GEMINI_MODEL || 'gemini-2.5-flash',
      timeoutMs: positiveNumber(env.GEMINI_TIMEOUT_MS, 30000),
    },
    aiRateLimit: {
      windowMs: positiveNumber(env.AI_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
      max: positiveNumber(env.AI_RATE_LIMIT_MAX, 30),
    },
  };
}

module.exports = { loadConfig };

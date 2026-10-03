// Serves the production build through the real Express app with AI enabled via a stub.
// Used by playwright.config.ts as the webServer; run `npm run build` first.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../../server/src/app');
const { loadConfig } = require('../../server/src/config');
const { geminiStub } = require('./gemini-stub.cjs');

const root = path.resolve(__dirname, '..', '..');
const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('e2e: dist/ is missing. Run `npm run build` before the browser tests.');
  process.exit(1);
}

const port = Number(process.env.E2E_PORT) || 4318;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaplearning-e2e-'));
const config = loadConfig({
  NODE_ENV: 'production',
  CLIENT_DIST: dist,
  DATA_DIR: dataDir,
  GEMINI_API_KEY: 'e2e-stub-key',
  GEMINI_MODEL: 'gemini-e2e-stub',
  AI_RATE_LIMIT_MAX: '1000',
});

createApp(config, { fetchImpl: geminiStub }).then((app) => {
  const server = app.listen(port, '127.0.0.1', () => console.log(`e2e server on http://127.0.0.1:${port}`));
  const stop = () => server.close(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    process.exit(0);
  });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
});

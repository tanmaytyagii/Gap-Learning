const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./app');
const { loadConfig } = require('./config');

// One .env at the repository root configures both the API and the Vite frontend. Variables
// already set in the shell take precedence over the file.
const envFile = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

async function main() {
  const config = loadConfig();
  const app = await createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`GapLearning API listening on http://localhost:${config.port}`);
    console.log(`AI features: ${config.gemini.apiKey ? `enabled (${config.gemini.model})` : 'disabled (set GEMINI_API_KEY to enable)'}`);
    console.log(`Question authoring: ${config.adminToken ? 'enabled' : 'disabled (set ADMIN_TOKEN to enable)'}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});

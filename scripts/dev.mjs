// `npm run dev`: starts the API (http://localhost:8787) and the web app (http://localhost:5173)
// together. The web app proxies /api to the API. Ctrl+C stops both.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log([
  '',
  '  GapLearning dev servers',
  '  · App: http://localhost:5173  (Vite, hot reload)',
  '  · API: http://localhost:8787  (Express, restarts on change)',
  '  AI features turn on when GEMINI_API_KEY is set in .env (see .env.example).',
  '',
].join('\n'));

const children = [
  spawn(npm, ['run', 'dev:server'], { stdio: 'inherit' }),
  spawn(npm, ['run', 'dev:web'], { stdio: 'inherit' }),
];

const stop = (code = 0) => {
  children.forEach((child) => { if (!child.killed) child.kill('SIGTERM'); });
  process.exit(code);
};

children.forEach((child) => child.on('exit', (code) => stop(code ?? 0)));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

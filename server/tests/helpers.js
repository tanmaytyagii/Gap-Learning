const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');

/** Starts the app on a random port with an isolated data directory. */
async function startServer(env = {}, deps = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaplearning-test-'));
  const config = loadConfig({ CLIENT_DIST: 'false', DATA_DIR: dataDir, ...env });
  const app = await createApp(config, deps);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const url = `http://127.0.0.1:${server.address().port}`;

  const request = async (method, route, { body, headers = {}, raw } = {}) => {
    const response = await fetch(`${url}${route}`, {
      method,
      headers: body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Not a JSON body; tests inspect `text` instead.
    }
    return { status: response.status, headers: response.headers, json, text };
  };

  return {
    url,
    dataDir,
    request,
    close: () => new Promise((resolve) => {
      server.close(() => {
        fs.rmSync(dataDir, { recursive: true, force: true });
        resolve();
      });
    }),
  };
}

/** A stand-in for fetch that answers Gemini requests with canned text and records them. */
function fakeGemini(respond) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, body });
    const result = await respond(body, calls.length);
    if (result instanceof Response) return result;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: result }] } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetchImpl, calls };
}

module.exports = { startServer, fakeGemini };

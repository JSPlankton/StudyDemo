import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const serveScript = path.join(root, 'serve.py');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 5000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error(`Server did not respond: ${url}`);
}

test('local preview server returns browser-safe module MIME types', async () => {
  const port = await getFreePort();
  const server = spawn('python', [serveScript, '--directory', root, '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/index.html`);

    const app = await fetch(`http://127.0.0.1:${port}/src/app.js`);
    const core = await fetch(`http://127.0.0.1:${port}/src/app-core.mjs`);
    const content = await fetch(`http://127.0.0.1:${port}/src/content.mjs`);
    const manifest = await fetch(`http://127.0.0.1:${port}/manifest.webmanifest`);
    const css = await fetch(`http://127.0.0.1:${port}/styles.css`);
    const svg = await fetch(`http://127.0.0.1:${port}/assets/icon.svg`);
    const json = await fetch(`http://127.0.0.1:${port}/tests/fixtures/mime.json`);

    assert.match(app.headers.get('content-type') || '', /text\/javascript/);
    assert.match(core.headers.get('content-type') || '', /text\/javascript/);
    assert.match(content.headers.get('content-type') || '', /text\/javascript/);
    assert.match(manifest.headers.get('content-type') || '', /application\/manifest\+json/);
    assert.match(css.headers.get('content-type') || '', /text\/css/);
    assert.match(svg.headers.get('content-type') || '', /image\/svg\+xml/);
    assert.match(json.headers.get('content-type') || '', /application\/json/);
  } finally {
    server.kill();
  }
});

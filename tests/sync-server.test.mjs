import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const syncServerScript = path.join(root, 'sync_server.py');
const pythonCommand = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

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

async function waitForHealth(url, server) {
  const deadline = Date.now() + 5000;
  let lastError;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`sync server exited early with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error(`sync server did not respond: ${url}`);
}

async function withSyncServer(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'study-sync-'));
  const port = await getFreePort();
  const dbPath = path.join(tempDir, 'sync.sqlite3');
  const server = spawn(pythonCommand, [
    syncServerScript,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--db',
    dbPath,
  ], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHealth(baseUrl, server);
    await run(baseUrl);
  } finally {
    server.kill();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('sync server stores and returns a state by account key', async () => {
  await withSyncServer(async (baseUrl) => {
    const account = 'home_2026';
    const state = {
      version: 2,
      createdAt: '2026-06-29',
      activeAccountId: null,
      accounts: [{ id: 'a1', name: 'Me' }],
    };

    const missing = await fetch(`${baseUrl}/api/sync/${account}`);
    assert.equal(missing.status, 200);
    assert.equal((await missing.json()).exists, false);

    const saved = await fetch(`${baseUrl}/api/sync/${account}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    const savedBody = await saved.json();
    assert.equal(saved.status, 200);
    assert.equal(savedBody.ok, true);
    assert.equal(savedBody.revision, 1);
    assert.equal(typeof savedBody.updatedAt, 'string');

    const loaded = await fetch(`${baseUrl}/api/sync/${account}`);
    const loadedBody = await loaded.json();
    assert.equal(loadedBody.exists, true);
    assert.equal(loadedBody.revision, 1);
    assert.deepEqual(loadedBody.state, state);
  });
});

test('sync server rejects unsafe account keys and malformed state bodies', async () => {
  await withSyncServer(async (baseUrl) => {
    const badAccount = await fetch(`${baseUrl}/api/sync/bad.account`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: { version: 2, accounts: [{ id: 'a1', name: 'Me' }] } }),
    });
    assert.equal(badAccount.status, 400);

    const malformed = await fetch(`${baseUrl}/api/sync/home_2026`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: { version: 2, accounts: {} } }),
    });
    assert.equal(malformed.status, 400);

    const emptyAccounts = await fetch(`${baseUrl}/api/sync/home_2026`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: { version: 2, accounts: [] } }),
    });
    assert.equal(emptyAccounts.status, 400);
  });
});

test('sync server rejects stale revision writes instead of overwriting cloud state', async () => {
  await withSyncServer(async (baseUrl) => {
    const account = 'home_2026';
    const firstState = {
      version: 2,
      createdAt: '2026-06-29',
      activeAccountId: null,
      accounts: [{ id: 'a1', name: 'Me' }],
    };
    const secondState = {
      version: 2,
      createdAt: '2026-06-30',
      activeAccountId: null,
      accounts: [{ id: 'a2', name: 'Other' }],
    };

    const first = await fetch(`${baseUrl}/api/sync/${account}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: firstState }),
    });
    assert.equal(first.status, 200);
    assert.equal((await first.json()).revision, 1);

    const stale = await fetch(`${baseUrl}/api/sync/${account}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 0, state: secondState }),
    });
    const staleBody = await stale.json();
    assert.equal(stale.status, 409);
    assert.equal(staleBody.revision, 1);

    const afterConflict = await fetch(`${baseUrl}/api/sync/${account}`).then((response) => response.json());
    assert.deepEqual(afterConflict.state, firstState);

    const current = await fetch(`${baseUrl}/api/sync/${account}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 1, state: secondState }),
    });
    assert.equal(current.status, 200);
    assert.equal((await current.json()).revision, 2);
  });
});

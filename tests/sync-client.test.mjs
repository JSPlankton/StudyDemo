import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchRemoteState,
  hasLocalLearningState,
  makeSyncPayload,
  normalizeSyncAccount,
  pushRemoteState,
} from '../src/sync-client.mjs';

test('normalizes sync account names into safe server keys', () => {
  assert.equal(normalizeSyncAccount(' Home_2026 '), 'home_2026');
  assert.equal(normalizeSyncAccount('study-abc123'), 'study-abc123');

  assert.throws(() => normalizeSyncAccount('ab'), /3-32/);
  assert.throws(() => normalizeSyncAccount('family account'), /字母|数字|下划线|短横线/);
  assert.throws(() => normalizeSyncAccount('家庭学习'), /字母|数字|下划线|短横线/);
});

test('builds a cloud sync payload from an exported app state JSON string with optional revision guard', () => {
  const exportedState = JSON.stringify({
    version: 2,
    createdAt: '2026-06-29',
    activeAccountId: null,
    accounts: [],
  });

  assert.deepEqual(makeSyncPayload(exportedState, { expectedRevision: 3 }), {
    expectedRevision: 3,
    state: {
      version: 2,
      createdAt: '2026-06-29',
      activeAccountId: null,
      accounts: [],
    },
  });

  assert.throws(() => makeSyncPayload('{bad json'), /进度 JSON/);
  assert.throws(() => makeSyncPayload(JSON.stringify({ version: 2, accounts: {} })), /accounts/);
});

test('rejects upload payloads that would erase all local learning accounts', () => {
  assert.throws(
    () => makeSyncPayload(JSON.stringify({ version: 2, accounts: [] }), { requireLocalAccounts: true }),
    /学习账号/,
  );
});

test('detects whether the exported state has local learning accounts before upload', () => {
  assert.equal(hasLocalLearningState(JSON.stringify({ version: 2, accounts: [] })), false);
  assert.equal(
    hasLocalLearningState(JSON.stringify({ version: 2, accounts: [{ id: 'a1', name: 'Me' }] })),
    true,
  );
  assert.equal(hasLocalLearningState('{bad json'), false);
});

test('uses an absolute root api path so static subpaths do not change sync routing', async () => {
  const urls = [];
  const fakeFetch = async (url) => {
    urls.push(url);
    return new Response(JSON.stringify({ ok: true, exists: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  await fetchRemoteState('home_2026', fakeFetch);
  await pushRemoteState('home_2026', { state: { version: 2, accounts: [] } }, fakeFetch);

  assert.deepEqual(urls, ['/api/sync/home_2026', '/api/sync/home_2026']);
});

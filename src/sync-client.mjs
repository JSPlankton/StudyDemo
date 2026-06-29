export const SYNC_BINDING_KEY = 'shnu-adult-study-plan-sync-v1';

const ACCOUNT_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;

function storageAvailable(storage) {
  return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function';
}

function validateStateShape(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('同步进度必须是对象。');
  }
  if (typeof state.version !== 'number') {
    throw new Error('同步进度缺少 version。');
  }
  if (!Array.isArray(state.accounts)) {
    throw new Error('同步进度的 accounts 必须是数组。');
  }
}

async function readJsonResponse(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || `云同步请求失败（${response.status}）`);
  }

  return body;
}

export function normalizeSyncAccount(value) {
  const account = String(value || '').trim().toLowerCase();
  if (!ACCOUNT_PATTERN.test(account)) {
    throw new Error('同步账号需要 3-32 位，只能使用字母、数字、下划线或短横线。');
  }
  return account;
}

export function makeSyncPayload(exportedStateJson, options = {}) {
  let state = null;
  try {
    state = JSON.parse(exportedStateJson);
  } catch {
    throw new Error('进度 JSON 格式不正确，无法同步。');
  }

  validateStateShape(state);
  if (options.requireLocalAccounts && state.accounts.length === 0) {
    throw new Error('本机还没有学习账号，不能上传空进度。');
  }
  const payload = { state };
  if (Object.prototype.hasOwnProperty.call(options, 'expectedRevision')) {
    payload.expectedRevision = Number.isFinite(options.expectedRevision) ? options.expectedRevision : null;
  }
  return payload;
}

export function hasLocalLearningState(exportedStateJson) {
  try {
    const state = JSON.parse(exportedStateJson);
    validateStateShape(state);
    return state.accounts.length > 0;
  } catch {
    return false;
  }
}

export function loadSyncBinding(storage = globalThis.localStorage) {
  if (!storageAvailable(storage)) return null;

  try {
    const raw = storage.getItem(SYNC_BINDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      account: normalizeSyncAccount(parsed.account),
      updatedAt: parsed.updatedAt || null,
      revision: Number.isFinite(parsed.revision) ? parsed.revision : null,
    };
  } catch {
    return null;
  }
}

export function saveSyncBinding(binding, storage = globalThis.localStorage) {
  const next = {
    account: normalizeSyncAccount(binding?.account),
    updatedAt: binding?.updatedAt || null,
    revision: Number.isFinite(binding?.revision) ? binding.revision : null,
  };

  if (storageAvailable(storage)) {
    storage.setItem(SYNC_BINDING_KEY, JSON.stringify(next));
  }

  return next;
}

export function clearSyncBinding(storage = globalThis.localStorage) {
  if (!storage || typeof storage.removeItem !== 'function') return;
  storage.removeItem(SYNC_BINDING_KEY);
}

export async function fetchRemoteState(account, fetcher = globalThis.fetch) {
  const key = normalizeSyncAccount(account);
  const response = await fetcher(`/api/sync/${encodeURIComponent(key)}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  return readJsonResponse(response);
}

export async function pushRemoteState(account, payload, fetcher = globalThis.fetch) {
  const key = normalizeSyncAccount(account);
  const response = await fetcher(`/api/sync/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(response);
}

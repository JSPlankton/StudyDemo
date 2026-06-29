import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

test('service worker leaves cloud sync API requests uncached', async () => {
  const source = await fs.readFile(path.join(root, 'sw.js'), 'utf-8');

  assert.match(source, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(source, /return;\s*\}\s*const acceptsHtml/s);
});

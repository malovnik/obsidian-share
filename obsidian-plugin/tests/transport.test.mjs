import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pluginSource = await readFile(
  new URL('../src/main.ts', import.meta.url),
  'utf8',
);

test('all external API calls use the CORS-free Obsidian transport', () => {
  assert.match(
    pluginSource,
    /import\s*\{[^}]*\brequestUrl\b[^}]*\}\s*from\s*['"]obsidian['"]/s,
    'requestUrl must be imported from the Obsidian API',
  );
  assert.doesNotMatch(
    pluginSource,
    /\bfetch\s*\(/,
    'browser fetch triggers a CORS preflight against SprintHost',
  );
  assert.equal(
    [...pluginSource.matchAll(/\brequestUrl\s*\(\s*\{/g)].length,
    3,
    'notes, media, and metadata requests must all use requestUrl',
  );
  assert.equal(
    [...pluginSource.matchAll(/\bthrow:\s*false\b/g)].length,
    3,
    'all requestUrl calls must preserve explicit HTTP status handling',
  );
});

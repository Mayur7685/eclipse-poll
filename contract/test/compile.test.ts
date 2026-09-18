/**
 * Contract compile test — verifies compiled artefacts are present and correct.
 * Works in CI (uses dist/managed) and locally (falls back to src/managed).
 *
 * Run: node --test test/compile.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');

// Use dist/managed if available (committed to repo, available in CI)
// Fall back to src/managed for local dev with freshly compiled contract
const distManaged = resolve(root, 'dist/managed/eclipse_poll');
const srcManaged  = resolve(root, 'src/managed/eclipse_poll');
const managedDir  = existsSync(distManaged) ? distManaged : srcManaged;
const keysDir     = resolve(managedDir, 'keys');
const contractJs  = resolve(managedDir, 'contract/index.js');

// ── Prover key files ───────────────────────────────────────────────────────

describe('Circuit prover keys', () => {
  const expectedProvers = [
    'castBinaryVote.prover',
    'castRankedVote.prover',
    'closePoll.prover',
    'createPoll.prover',
    'registerCommunity.prover',
  ];

  for (const prover of expectedProvers) {
    it(`${prover} exists`, () => {
      const filePath = resolve(keysDir, prover);
      assert.ok(existsSync(filePath), `Expected prover key at ${filePath}`);
    });

    it(`${prover} is non-empty`, () => {
      const filePath = resolve(keysDir, prover);
      assert.ok(existsSync(filePath), `${prover} must exist before checking size`);
      assert.ok(readFileSync(filePath).length > 0, `Expected ${prover} to be non-empty`);
    });
  }
});

// ── dist/index.js ──────────────────────────────────────────────────────────

describe('Compiled output', () => {
  it('contract/dist/index.js exists', () => {
    assert.ok(existsSync(resolve(root, 'dist/index.js')), `dist/index.js not found`);
  });
});

// ── Enum values in compiled output ─────────────────────────────────────────

describe('PollType enum in compiled output', () => {
  it('managed contract JS exists', () => {
    assert.ok(existsSync(contractJs), `managed contract JS not found at ${contractJs}`);
  });

  it('PollType.SIMPLE = 0', () => {
    const src = readFileSync(contractJs, 'utf-8');
    assert.match(src, /PollType\[PollType\[['"]SIMPLE['"]\]\s*=\s*0\]/);
  });

  it('PollType.RANKED_CHOICE = 1', () => {
    const src = readFileSync(contractJs, 'utf-8');
    assert.match(src, /PollType\[PollType\[['"]RANKED_CHOICE['"]\]\s*=\s*1\]/);
  });

  it('PollType.HIERARCHICAL = 2', () => {
    const src = readFileSync(contractJs, 'utf-8');
    assert.match(src, /PollType\[PollType\[['"]HIERARCHICAL['"]\]\s*=\s*2\]/);
  });
});

describe('CredentialType enum in compiled output', () => {
  it('CredentialType.FREE = 0', () => {
    const src = readFileSync(contractJs, 'utf-8');
    assert.match(src, /CredentialType\[CredentialType\[['"]FREE['"]\]\s*=\s*0\]/);
  });
});

/**
 * Contract compile test — verifies that the managed contract artefacts
 * and the TypeScript build output are present and correct.
 *
 * Run: node --test test/compile.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Task 1: Prover key files ───────────────────────────────────────────────

describe('Circuit prover keys', () => {
  const keysDir = resolve(root, 'src/managed/eclipse_poll/keys');

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
      assert.ok(
        existsSync(filePath),
        `Expected prover key at ${filePath} but it was not found`,
      );
    });

    it(`${prover} is non-empty`, () => {
      const filePath = resolve(keysDir, prover);
      const stat = existsSync(filePath);
      assert.ok(stat, `${prover} must exist before checking size`);
      const content = readFileSync(filePath);
      assert.ok(
        content.length > 0,
        `Expected ${prover} to be non-empty`,
      );
    });
  }
});

// ── Task 2: dist/index.js ─────────────────────────────────────────────────

describe('Compiled output', () => {
  it('contract/dist/index.js exists', () => {
    const distIndex = resolve(root, 'dist/index.js');
    assert.ok(
      existsSync(distIndex),
      `dist/index.js not found — run 'npm run build' first`,
    );
  });
});

// ── Task 3 & 4: Enum values in compiled output ────────────────────────────

describe('PollType enum in compiled output', () => {
  // The enum is defined in the managed contract JS, which is re-exported through dist.
  // We read the JS source directly to avoid ESM import-of-native-module issues.
  const managedContractJs = resolve(
    root,
    'src/managed/eclipse_poll/contract/index.js',
  );

  let src: string;

  it('managed contract JS exists', () => {
    assert.ok(
      existsSync(managedContractJs),
      `managed contract JS not found at ${managedContractJs}`,
    );
    src = readFileSync(managedContractJs, 'utf-8');
  });

  it('PollType.SIMPLE = 0', () => {
    src = src ?? readFileSync(managedContractJs, 'utf-8');
    // Matches: PollType[PollType['SIMPLE'] = 0] = 'SIMPLE'  or  PollType[PollType["SIMPLE"] = 0]
    assert.match(
      src,
      /PollType\[PollType\[['"]SIMPLE['"]\]\s*=\s*0\]/,
      'PollType.SIMPLE should equal 0 in compiled output',
    );
  });

  it('PollType.RANKED_CHOICE = 1', () => {
    src = src ?? readFileSync(managedContractJs, 'utf-8');
    assert.match(
      src,
      /PollType\[PollType\[['"]RANKED_CHOICE['"]\]\s*=\s*1\]/,
      'PollType.RANKED_CHOICE should equal 1 in compiled output',
    );
  });

  it('PollType.HIERARCHICAL = 2', () => {
    src = src ?? readFileSync(managedContractJs, 'utf-8');
    assert.match(
      src,
      /PollType\[PollType\[['"]HIERARCHICAL['"]\]\s*=\s*2\]/,
      'PollType.HIERARCHICAL should equal 2 in compiled output',
    );
  });
});

describe('CredentialType enum in compiled output', () => {
  const managedContractJs = resolve(
    root,
    'src/managed/eclipse_poll/contract/index.js',
  );

  let src: string;

  it('CredentialType.FREE = 0', () => {
    src = readFileSync(managedContractJs, 'utf-8');
    assert.match(
      src,
      /CredentialType\[CredentialType\[['"]FREE['"]\]\s*=\s*0\]/,
      'CredentialType.FREE should equal 0 in compiled output',
    );
  });
});

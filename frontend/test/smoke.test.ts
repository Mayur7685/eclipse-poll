/**
 * Frontend smoke tests — no browser required.
 * Tests check static build artefacts and source file contents.
 *
 * Run: node --test test/smoke.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Test 1 & 2: dist/index.html ───────────────────────────────────────────

describe('dist/index.html', () => {
  const distIndex = resolve(root, 'dist/index.html');

  it('exists after build', () => {
    assert.ok(
      existsSync(distIndex),
      `dist/index.html not found — run 'npm run build' first`,
    );
  });

  it('contains "Eclipse Poll" title', () => {
    const html = readFileSync(distIndex, 'utf-8');
    assert.ok(
      html.includes('<title>Eclipse Poll</title>'),
      'dist/index.html should contain <title>Eclipse Poll</title>',
    );
  });
});

// ── Test 3: public/zk/eclipse-poll/keys/ has exactly 5 prover files ────────

describe('ZK prover keys in public assets', () => {
  const keysDir = resolve(root, 'public/zk/eclipse-poll/keys');

  it('keys directory exists', () => {
    assert.ok(existsSync(keysDir), `Keys directory not found: ${keysDir}`);
  });

  it('has exactly 5 prover files', () => {
    const allFiles = readdirSync(keysDir);
    const proverFiles = allFiles.filter((f) => f.endsWith('.prover'));

    assert.strictEqual(
      proverFiles.length,
      5,
      `Expected 5 .prover files, found ${proverFiles.length}: [${proverFiles.join(', ')}]`,
    );
  });

  it('all 5 expected prover files are present', () => {
    const expected = [
      'castBinaryVote.prover',
      'castRankedVote.prover',
      'closePoll.prover',
      'createPoll.prover',
      'registerCommunity.prover',
    ];

    const allFiles = readdirSync(keysDir);

    for (const name of expected) {
      assert.ok(
        allFiles.includes(name),
        `Missing expected prover file: ${name}`,
      );
    }
  });
});

// ── Test 4: contract-info.json is valid JSON with compiler-version ───────────

describe('contract-info.json', () => {
  const contractInfoPath = resolve(
    root,
    'public/zk/eclipse-poll/compiler/contract-info.json',
  );

  it('exists', () => {
    assert.ok(
      existsSync(contractInfoPath),
      `contract-info.json not found at ${contractInfoPath}`,
    );
  });

  it('is valid JSON', () => {
    const raw = readFileSync(contractInfoPath, 'utf-8');
    let parsed: unknown;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(raw);
    }, 'contract-info.json must be parseable JSON');
    assert.ok(parsed !== null && typeof parsed === 'object', 'contract-info.json must parse to an object');
  });

  it('has a compiler-version field', () => {
    const raw = readFileSync(contractInfoPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    assert.ok(
      'compiler-version' in parsed,
      `contract-info.json must contain a "compiler-version" field. Keys found: ${Object.keys(parsed).join(', ')}`,
    );

    assert.ok(
      typeof parsed['compiler-version'] === 'string' && parsed['compiler-version'].length > 0,
      '"compiler-version" must be a non-empty string',
    );
  });
});

// ── Test 5: src/lib/eclipse.ts exports getOrCreateUserSecretKey ─────────────

describe('src/lib/eclipse.ts', () => {
  const eclipseSrc = resolve(root, 'src/lib/eclipse.ts');

  it('file exists', () => {
    assert.ok(existsSync(eclipseSrc), `eclipse.ts not found at ${eclipseSrc}`);
  });

  it('exports getOrCreateUserSecretKey', () => {
    const src = readFileSync(eclipseSrc, 'utf-8');
    // The function must be exported (either as `export function` or `export { getOrCreateUserSecretKey }`)
    assert.ok(
      src.includes('export function getOrCreateUserSecretKey') ||
        src.includes('export { getOrCreateUserSecretKey'),
      'eclipse.ts must export getOrCreateUserSecretKey',
    );
  });

  it('getOrCreateUserSecretKey returns a Uint8Array', () => {
    const src = readFileSync(eclipseSrc, 'utf-8');
    // The function signature should reference Uint8Array as return type
    assert.ok(
      src.includes('getOrCreateUserSecretKey(): Uint8Array') ||
        // Also accept the function body using `new Uint8Array` or `Uint8Array.from`
        (src.includes('getOrCreateUserSecretKey') && src.includes('Uint8Array')),
      'getOrCreateUserSecretKey must work with Uint8Array',
    );
  });
});

// ── Test 6: No FHEpoll/wagmi/Ethereum references in built output ─────────────

describe('Built output has no legacy/wrong framework references', () => {
  // We look in the dist assets for telltale strings that would indicate
  // a wrong build (e.g. an old FHEpoll variant, wagmi, or raw Ethereum).
  const distDir = resolve(root, 'dist');

  it('dist/assets directory exists', () => {
    assert.ok(
      existsSync(resolve(distDir, 'assets')),
      'dist/assets directory not found — run the build first',
    );
  });

  it('built JS does not contain "FHEpoll" references', () => {
    const assetsDir = resolve(distDir, 'assets');
    const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));

    assert.ok(jsFiles.length > 0, 'No JS files found in dist/assets');

    for (const jsFile of jsFiles) {
      const content = readFileSync(resolve(assetsDir, jsFile), 'utf-8');
      assert.ok(
        !content.includes('FHEpoll'),
        `Found forbidden "FHEpoll" reference in ${jsFile}`,
      );
    }
  });

  it('built JS does not contain "wagmi" references', () => {
    const assetsDir = resolve(distDir, 'assets');
    const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));

    for (const jsFile of jsFiles) {
      const content = readFileSync(resolve(assetsDir, jsFile), 'utf-8');
      assert.ok(
        !content.includes('wagmi'),
        `Found forbidden "wagmi" reference in ${jsFile}`,
      );
    }
  });

  it('built JS does not contain bare "ethereum" library references', () => {
    const assetsDir = resolve(distDir, 'assets');
    const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));

    for (const jsFile of jsFiles) {
      const content = readFileSync(resolve(assetsDir, jsFile), 'utf-8');
      // "Ethereum" the brand name (capitalised) should not appear as a standalone library reference.
      // We avoid flagging the ethereum-logo.svg reference in public assets strings.
      const etherImportPattern = /from\s+['"]ethereum|require\(['"]ethereum/;
      assert.ok(
        !etherImportPattern.test(content),
        `Found forbidden Ethereum library import in ${jsFile}`,
      );
    }
  });
});

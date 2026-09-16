/**
 * Attestation API smoke tests.
 *
 * Starts the compiled server in a child process with Supabase disabled
 * so all persistence falls back to the in-memory store.
 *
 * Run: node --test test/server.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Pick a high port unlikely to conflict with local dev server
const TEST_PORT = 4097;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// ── Child process lifecycle ───────────────────────────────────────────────

let serverProcess: ReturnType<typeof spawn>;

async function waitForServer(url: string, retries = 20, delayMs = 300): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Server at ${url} did not start within ${retries * delayMs}ms`);
}

/**
 * Helper: perform a JSON fetch with a timeout guard.
 */
async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  return { status: res.status, body: await res.json() };
}

// ── Suite setup / teardown ────────────────────────────────────────────────

describe('Attestation API server', () => {
  before(async () => {
    // Start the compiled JS server, explicitly clearing Supabase env vars
    // so the server falls back to its in-memory store.
    serverProcess = spawn('node', [resolve(root, 'dist/server.js')], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        // Disable Supabase → force in-memory fallback
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        // Minimal signing key so signing.ts initialises without error
        ATTESTATION_SECRET_KEY: '0x' + '01'.repeat(32),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Surface server stderr in test output only on failure
    serverProcess.stderr?.on('data', (_d: Buffer) => {/* suppress */});
    serverProcess.stdout?.on('data', (_d: Buffer) => {/* suppress */});

    await waitForServer(BASE_URL);
  });

  after(() => {
    serverProcess?.kill('SIGTERM');
  });

  // ── Test 1: GET /health ─────────────────────────────────────────────────

  it('GET /health returns { status: "ok" }', async () => {
    const { status, body } = await fetchJson('/health');
    assert.strictEqual(status, 200, 'expected HTTP 200');
    assert.strictEqual(body.status, 'ok', 'expected body.status === "ok"');
  });

  // ── Test 2: POST /submissions with valid body returns { ok: true } ──────

  it('POST /submissions with valid body returns { ok: true }', async () => {
    const { status, body } = await fetchJson('/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        address: '0xTestAddress001',
        pollId: 'poll-abc',
        ciphertext: 'encrypted-payload-xyz',
      }),
    });
    assert.strictEqual(status, 200, `expected HTTP 200, got ${status}: ${JSON.stringify(body)}`);
    assert.strictEqual(body.ok, true, 'expected body.ok === true');
  });

  // ── Test 3: GET /submissions/:address returns array ──────────────────────

  it('GET /submissions/:address returns array', async () => {
    // First ensure at least one entry exists for this address
    await fetchJson('/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        address: '0xTestAddress002',
        pollId: 'poll-xyz',
        ciphertext: 'encrypted-payload-abc',
      }),
    });

    const { status, body } = await fetchJson('/submissions/0xTestAddress002');
    assert.strictEqual(status, 200, `expected HTTP 200, got ${status}`);
    assert.ok(Array.isArray(body), `expected array response, got ${typeof body}`);
    assert.ok(body.length >= 1, 'expected at least one submission record');

    const record = body[0];
    assert.ok('pollId' in record, 'record should have pollId field');
    assert.ok('ciphertext' in record, 'record should have ciphertext field');
    assert.ok('savedAt' in record, 'record should have savedAt field');
  });

  // ── Test 4: POST /submissions with missing fields returns 400 ────────────

  it('POST /submissions with missing fields returns 400', async () => {
    // Missing ciphertext
    const { status, body } = await fetchJson('/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        address: '0xSomeAddress',
        // pollId missing
        // ciphertext missing
      }),
    });
    assert.strictEqual(status, 400, `expected HTTP 400, got ${status}: ${JSON.stringify(body)}`);
    assert.ok('error' in body, 'expected error field in 400 response');
  });

  // ── Test 5: GET /communities returns array ───────────────────────────────

  it('GET /communities returns array', async () => {
    const { status, body } = await fetchJson('/communities');
    assert.strictEqual(status, 200, `expected HTTP 200, got ${status}`);
    assert.ok(Array.isArray(body), `expected array response, got ${typeof body}`);
  });
});

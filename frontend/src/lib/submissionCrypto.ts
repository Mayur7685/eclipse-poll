// Client-side encryption for vote submissions.
//
// Key derivation: HKDF from userSecretKey (persisted in localStorage).
// The same key is always available without any wallet interaction.
// The server stores opaque ciphertext and can never read plaintext choices.

import { getOrCreateUserSecretKey } from './eclipse';

const DERIVED_KEY_CACHE = 'zkpoll:enc-key:v2';

/** Derive AES-GCM-256 key from the user's persisted secret key. */
export async function getDerivedKey(): Promise<CryptoKey> {
  // Try cache first
  const cached = sessionStorage.getItem(DERIVED_KEY_CACHE);
  if (cached) {
    try {
      const raw = Uint8Array.from(atob(cached), c => c.charCodeAt(0));
      return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    } catch {
      sessionStorage.removeItem(DERIVED_KEY_CACHE);
    }
  }

  const userSecretKey = getOrCreateUserSecretKey();

  // Import userSecretKey as HKDF key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    userSecretKey.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveKey'],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('eclipse-poll-submission-v1'),
      info: new TextEncoder().encode('vote-encryption'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  // Cache in sessionStorage
  const raw = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(DERIVED_KEY_CACHE, btoa(String.fromCharCode(...new Uint8Array(raw))));

  return key;
}

/** Encrypt a JSON-serialisable value. Returns base64 string (12-byte IV prepended). */
export async function encryptJSON(data: unknown, key?: CryptoKey): Promise<string> {
  const k = key ?? await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, encoded);
  const combined = new Uint8Array(12 + ct.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ct), 12);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64 ciphertext produced by encryptJSON. */
export async function decryptJSON(b64: string, key?: CryptoKey): Promise<unknown> {
  const k = key ?? await getDerivedKey();
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, 12) },
    k,
    combined.slice(12),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

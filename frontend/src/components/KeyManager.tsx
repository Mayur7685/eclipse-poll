// KeyManager — lets users export and import their encryption key.
// The key is exported as an AES-GCM encrypted JSON file protected by a user-set password.
// No server involved — fully private.

import { useState } from 'react';
import { getOrCreateUserSecretKey } from '../lib/eclipse';

const USER_SECRET_KEY = 'eclipse:userSecretKey:v1';

async function exportKey(password: string): Promise<void> {
  const sk = getOrCreateUserSecretKey();

  // Derive an AES key from the user's password using PBKDF2
  const enc      = new TextEncoder();
  const keyMat   = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const salt     = crypto.getRandomValues(new Uint8Array(16));
  const aesKey   = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, sk);

  const payload = JSON.stringify({
    v:    1,
    salt: btoa(String.fromCharCode(...salt)),
    iv:   btoa(String.fromCharCode(...iv)),
    ct:   btoa(String.fromCharCode(...new Uint8Array(ct))),
  });

  const blob = new Blob([payload], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'eclipse-poll-key.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importKey(file: File, password: string): Promise<boolean> {
  try {
    const text    = await file.text();
    const payload = JSON.parse(text) as { v: number; salt: string; iv: string; ct: string };
    if (payload.v !== 1) throw new Error('Unknown key file version');

    const enc    = new TextEncoder();
    const salt   = Uint8Array.from(atob(payload.salt), c => c.charCodeAt(0));
    const iv     = Uint8Array.from(atob(payload.iv),   c => c.charCodeAt(0));
    const ct     = Uint8Array.from(atob(payload.ct),   c => c.charCodeAt(0));

    const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
    const sk    = new Uint8Array(plain);
    if (sk.length !== 32) throw new Error('Invalid key length');

    localStorage.setItem(USER_SECRET_KEY, btoa(String.fromCharCode(...sk)));
    return true;
  } catch {
    return false;
  }
}

export default function KeyManager() {
  const [mode, setMode]         = useState<'idle' | 'export' | 'import'>('idle');
  const [password, setPassword] = useState('');
  const [file, setFile]         = useState<File | null>(null);
  const [status, setStatus]     = useState<'idle' | 'ok' | 'error'>('idle');
  const [msg, setMsg]           = useState('');

  const handleExport = async () => {
    if (!password) { setStatus('error'); setMsg('Enter a password to protect the file.'); return; }
    try {
      await exportKey(password);
      setStatus('ok'); setMsg('Key exported! Store this file safely.');
      setPassword('');
    } catch { setStatus('error'); setMsg('Export failed.'); }
  };

  const handleImport = async () => {
    if (!file || !password) { setStatus('error'); setMsg('Select a file and enter your password.'); return; }
    const ok = await importKey(file, password);
    if (ok) {
      setStatus('ok'); setMsg('Key restored! Your vote history should now be visible.');
      setMode('idle'); setPassword(''); setFile(null);
    } else {
      setStatus('error'); setMsg('Wrong password or invalid file.');
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Encryption Key</p>
          <p className="text-xs text-gray-400">Export to keep your vote history across devices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setMode(mode === 'export' ? 'idle' : 'export'); setStatus('idle'); setPassword(''); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            Export
          </button>
          <button onClick={() => { setMode(mode === 'import' ? 'idle' : 'import'); setStatus('idle'); setPassword(''); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            Import
          </button>
        </div>
      </div>

      {mode === 'export' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Set a password to protect the exported key file.</p>
          <input
            type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0070F3]"
          />
          <button onClick={handleExport}
            className="w-full text-xs font-medium py-2 rounded-lg bg-[#0070F3] text-white hover:bg-blue-600 transition-colors">
            Download Key File
          </button>
        </div>
      )}

      {mode === 'import' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Select your exported key file and enter its password.</p>
          <input type="file" accept=".json"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white" />
          <input
            type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0070F3]"
          />
          <button onClick={handleImport}
            className="w-full text-xs font-medium py-2 rounded-lg bg-[#0070F3] text-white hover:bg-blue-600 transition-colors">
            Restore Key
          </button>
        </div>
      )}

      {status !== 'idle' && (
        <p className={`text-xs ${status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>
      )}
    </div>
  );
}

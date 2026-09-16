// useConnectedAccounts — manages OAuth-connected social accounts.
// OAuth popups open server-side routes (no client IDs on frontend).
// Matches FHEpoll ConnectorSelector pattern exactly.

import { useState, useCallback, useEffect } from 'react';

export interface ConnectedAccount {
  type: 'X_TWITTER' | 'DISCORD' | 'GITHUB' | 'TELEGRAM';
  identifier: string;
  displayName?: string;
}

const SESSION_KEY = 'eclipse:connected_accounts_v2';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const VERIFIER    = import.meta.env.VITE_VERIFIER_URL ?? '/api';

const CHANNEL_NAMES: Record<string, string> = {
  X_TWITTER: 'eclipse-poll-twitter',
  DISCORD:   'eclipse-poll-discord',
  GITHUB:    'eclipse-poll-github',
};

const AUTH_URLS: Record<string, string> = {
  X_TWITTER: `${VERIFIER}/auth/twitter`,
  DISCORD:   `${VERIFIER}/auth/discord`,
  GITHUB:    `${VERIFIER}/auth/github`,
};

function loadFromSession(): ConnectedAccount[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // Handle both old format (array) and new format ({ accounts, expiresAt })
      if (Array.isArray(stored)) return stored;
      if (stored.expiresAt && Date.now() < stored.expiresAt) return stored.accounts ?? [];
      localStorage.removeItem(SESSION_KEY); // expired
    }
  } catch { /* ignore */ }
  return [];
}

function openOAuthPopup(type: string): Promise<{ userId: string; username: string }> {
  return new Promise((resolve, reject) => {
    const url     = AUTH_URLS[type];
    const channel = CHANNEL_NAMES[type];
    if (!url || !channel) { reject(new Error(`Unknown provider: ${type}`)); return; }

    const w = 520, h = 680;
    const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(url, channel, `width=${w},height=${h},left=${left},top=${top},scrollbars=yes`);
    if (!popup) { reject(new Error('Popup blocked — allow popups for this site')); return; }

    let settled = false;
    const bc = new BroadcastChannel(channel);

    const cleanup = () => { bc.close(); window.removeEventListener('message', onMsg); clearInterval(poll); };

    const handle = (data: Record<string, string>) => {
      if (settled) return; settled = true; cleanup();
      if (data?.status === 'success') resolve({ userId: data.userId, username: data.username });
      else reject(new Error(data?.message ?? 'OAuth failed'));
    };

    bc.onmessage = (e) => handle(e.data);
    const onMsg = (e: MessageEvent) => { if (e.data?.channel === channel) handle(e.data); };
    window.addEventListener('message', onMsg);

    const poll = setInterval(() => {
      if (popup.closed && !settled) { cleanup(); reject(new Error('Popup closed')); }
    }, 600);

    setTimeout(() => { cleanup(); popup.close(); reject(new Error('OAuth timed out')); }, 180_000);
  });
}

export function useConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(loadFromSession);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accounts, expiresAt: Date.now() + TTL_MS }));
  }, [accounts]);

  const addAccount = useCallback((account: ConnectedAccount) => {
    setAccounts(prev => [...prev.filter(a => a.type !== account.type), account]);
  }, []);

  const connect = useCallback(async (type: 'GITHUB' | 'DISCORD' | 'X_TWITTER') => {
    setIsConnecting(type);
    setError(null);
    try {
      const { userId, username } = await openOAuthPopup(type);
      addAccount({ type, identifier: userId, displayName: type === 'X_TWITTER' ? `@${username}` : username });
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setIsConnecting(null);
    }
  }, [addAccount]);

  const disconnect = useCallback((type: string) => {
    setAccounts(prev => prev.filter(a => a.type !== type));
  }, []);

  const getAccount = useCallback((type: string) =>
    accounts.find(a => a.type === type) ?? null, [accounts]);

  return {
    accounts,
    isConnecting,
    error,
    connectGithub:  () => connect('GITHUB'),
    connectDiscord: () => connect('DISCORD'),
    connectTwitter: () => connect('X_TWITTER'),
    disconnect,
    getAccount,
  };
}

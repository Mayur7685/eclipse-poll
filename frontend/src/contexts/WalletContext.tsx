import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { detectWallet, enableWallet, createConnectedSession, type ConnectedSession } from '../lib/midnight.js';

const WALLET_CONNECTED_KEY = 'eclipse:walletConnected:v1';

export type WalletErrorType = 'not_installed' | 'locked' | 'rejected' | 'network' | 'unknown';

export interface WalletError {
  type: WalletErrorType;
  message: string;
  /** User-friendly hint for how to fix */
  hint: string;
}

function classifyError(err: any): WalletError {
  const msg: string = err?.message ?? String(err ?? '');
  const lower = msg.toLowerCase();

  if (lower.includes('notunlocked') || lower.includes('not unlocked') || lower.includes('unlock shield')) {
    return {
      type: 'locked',
      message: 'Wallet is locked',
      hint: 'Open the 1AM Wallet extension and unlock your Shield, then try again.',
    };
  }
  if (lower.includes('not detected') || lower.includes('not installed') || lower.includes('extension')) {
    return {
      type: 'not_installed',
      message: 'Wallet not found',
      hint: 'Install the 1AM Wallet extension for Chrome/Brave, then refresh.',
    };
  }
  if (lower.includes('user rejected') || lower.includes('declined') || lower.includes('cancelled') || lower.includes('canceled')) {
    return {
      type: 'rejected',
      message: 'Connection declined',
      hint: 'You declined the connection request. Click Connect and approve in the wallet.',
    };
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network error',
      hint: 'Check your internet connection and ensure the Midnight preprod network is accessible.',
    };
  }
  return {
    type: 'unknown',
    message: msg || 'Failed to connect wallet',
    hint: 'Try refreshing the page or reconnecting the wallet.',
  };
}

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  address: string | null;
  session: ConnectedSession | null;
  connect: () => Promise<ConnectedSession | null>;
  disconnect: () => void;
  /** Structured error with type + hint */
  walletError: WalletError | null;
  clearError: () => void;
  /** Legacy string error for backward compat */
  error: string | null;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  isConnecting: false,
  isReconnecting: false,
  address: null,
  session: null,
  connect: async () => null,
  disconnect: () => {},
  walletError: null,
  clearError: () => {},
  error: null,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession]       = useState<ConnectedSession | null>(null);
  const [address, setAddress]       = useState<string | null>(null);
  const [isConnecting, setIsConnecting]     = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(
    () => !!localStorage.getItem(WALLET_CONNECTED_KEY)
  );
  const [walletError, setWalletError] = useState<WalletError | null>(null);

  const clearError = useCallback(() => setWalletError(null), []);

  const connect = async (): Promise<ConnectedSession | null> => {
    try {
      setIsConnecting(true);
      setWalletError(null);
      const wallet = await detectWallet();
      const api    = await enableWallet(wallet);
      const sess   = await createConnectedSession(api);
      setSession(sess);
      setAddress(sess.unshieldedAddress);
      localStorage.setItem(WALLET_CONNECTED_KEY, '1');
      // Warm up the proving provider in the background — prover keys are
      // fetched lazily on first vote. This prefetch makes first vote faster.
      setTimeout(() => {
        sess.providers.zkConfigProvider
          .getZkConfig('castBinaryVote')
          .catch(() => {}); // ignore errors — just warming cache
      }, 2000);
      return sess;
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      const classified = classifyError(err);
      setWalletError(classified);
      // If locked, clear the reconnect flag so we don't keep retrying silently
      if (classified.type === 'locked' || classified.type === 'not_installed') {
        localStorage.removeItem(WALLET_CONNECTED_KEY);
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setSession(null);
    setAddress(null);
    setWalletError(null);
    localStorage.removeItem(WALLET_CONNECTED_KEY);
  };

  // Auto-reconnect on mount if wallet was previously connected.
  useEffect(() => {
    const wasConnected = localStorage.getItem(WALLET_CONNECTED_KEY);
    if (!wasConnected) {
      setIsReconnecting(false);
      return;
    }
    let cancelled = false;
    const tryReconnect = async () => {
      try {
        const wallet = await detectWallet();
        if (!wallet) return;
        const api  = await enableWallet(wallet);
        const sess = await createConnectedSession(api);
        if (!cancelled) {
          setSession(sess);
          setAddress(sess.unshieldedAddress);
        }
      } catch (err: any) {
        // Silent on locked — user needs to unlock manually
        const classified = classifyError(err);
        if (!cancelled && classified.type !== 'locked') {
          setWalletError(classified);
        }
        if (!cancelled) localStorage.removeItem(WALLET_CONNECTED_KEY);
      } finally {
        if (!cancelled) setIsReconnecting(false);
      }
    };
    void tryReconnect();
    return () => { cancelled = true; };
  }, []);

  return (
    <WalletContext.Provider value={{
      isConnected: !!session,
      isConnecting,
      isReconnecting,
      address,
      session,
      connect,
      disconnect,
      walletError,
      clearError,
      error: walletError?.message ?? null,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  address: string | null;
  session: ConnectedSession | null;
  connect: () => Promise<ConnectedSession | null>;
  disconnect: () => void;
  error: string | null;
}


import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectWallet, enableWallet, createConnectedSession, type ConnectedSession } from '../lib/midnight.js';

const WALLET_CONNECTED_KEY = 'eclipse:walletConnected:v1';

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

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  isConnecting: false,
  isReconnecting: false,
  address: null,
  session: null,
  connect: async () => null,
  disconnect: () => {},
  error: null,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ConnectedSession | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(
    () => !!localStorage.getItem(WALLET_CONNECTED_KEY) // true on mount if was connected
  );
  const [error, setError] = useState<string | null>(null);

  const connect = async (): Promise<ConnectedSession | null> => {
    try {
      setIsConnecting(true);
      setError(null);
      const wallet = await detectWallet();
      const api = await enableWallet(wallet);
      const sess = await createConnectedSession(api);
      setSession(sess);
      setAddress(sess.unshieldedAddress);
      localStorage.setItem(WALLET_CONNECTED_KEY, '1');
      return sess;
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setSession(null);
    setAddress(null);
    localStorage.removeItem(WALLET_CONNECTED_KEY);
  };

  // Auto-reconnect on mount if wallet was previously connected.
  // Silently re-runs detectWallet/enableWallet/createConnectedSession so
  // isConnected is true on every page without the user clicking Connect again.
  useEffect(() => {
    const wasConnected = localStorage.getItem(WALLET_CONNECTED_KEY);
    if (!wasConnected) return;

    let cancelled = false;
    const tryReconnect = async () => {
      try {
        const wallet = await detectWallet();
        if (!wallet) return;
        const api = await enableWallet(wallet);
        const sess = await createConnectedSession(api);
        if (!cancelled) {
          setSession(sess);
          setAddress(sess.unshieldedAddress);
        }
      } catch {
        // Wallet locked or unavailable — clear flag so we don't retry on every load
        if (!cancelled) localStorage.removeItem(WALLET_CONNECTED_KEY);
      } finally {
        if (!cancelled) setIsReconnecting(false);
      }
    };

    void tryReconnect();
    return () => { cancelled = true; };
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!session,
        isConnecting,
        isReconnecting,
        address,
        session,
        connect,
        disconnect,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

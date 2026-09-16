import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectWallet, enableWallet, createConnectedSession, type ConnectedSession } from '../lib/midnight.js';

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  session: ConnectedSession | null;
  connect: () => Promise<ConnectedSession | null>;
  disconnect: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  isConnecting: false,
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
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!session,
        isConnecting,
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

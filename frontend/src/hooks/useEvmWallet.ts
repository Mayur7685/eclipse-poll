import { useState, useEffect } from 'react';
import { isEvmWalletAvailable, getEvmAddress, connectEvmWallet, onEvmAccountsChanged } from '../lib/evmWallet';

export function useEvmWallet() {
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAvailable] = useState(() => isEvmWalletAvailable());

  useEffect(() => {
    // Check if already connected
    getEvmAddress().then(setEvmAddress);
    // Listen for account changes
    const cleanup = onEvmAccountsChanged(setEvmAddress);
    return cleanup;
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const addr = await connectEvmWallet();
      setEvmAddress(addr);
    } finally {
      setIsConnecting(false);
    }
  };

  return { evmAddress, isConnecting, connect, isAvailable };
}

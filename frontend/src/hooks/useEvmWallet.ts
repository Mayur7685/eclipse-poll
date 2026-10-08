import { useState, useEffect } from 'react';
import { isEvmWalletAvailable, getEvmAddress, connectEvmWallet, onEvmAccountsChanged } from '../lib/evmWallet';

export function useEvmWallet() {
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAvailable] = useState(() => isEvmWalletAvailable());

  useEffect(() => {
    // Only check for already-connected address — do NOT attach accountsChanged listener
    // on mount because Phantom and MetaMask treat that as a connection request
    // and show an approval popup even for eth_accounts.
    // We attach the listener only after the user explicitly connects.
    getEvmAddress().then(setEvmAddress);
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const addr = await connectEvmWallet();
      setEvmAddress(addr);
      // Attach listener only after explicit connect
      if (addr) {
        onEvmAccountsChanged((newAddr) => setEvmAddress(newAddr));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return { evmAddress, isConnecting, connect, isAvailable };
}

import { useState } from 'react';
import { isEvmWalletAvailable, connectEvmWallet, onEvmAccountsChanged } from '../lib/evmWallet';

export function useEvmWallet() {
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAvailable] = useState(() => isEvmWalletAvailable());

  // Do NOT call eth_accounts on mount — Phantom shows an approval popup even
  // for this passive call. Only connect when the user explicitly clicks Connect.

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

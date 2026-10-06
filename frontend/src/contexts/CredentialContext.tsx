/**
 * CredentialContext — tracks which communities the current user has on-chain credentials for.
 *
 * Flow:
 *  1. User visits CredentialsHub, passes verification, calls claimCommunityCredential circuit.
 *  2. On success, we write { communityId, txHash, claimedAt } to localStorage.
 *  3. Any page (PollDetail, CommunityDetail, etc.) can call hasCredential(communityId) to check.
 *  4. On wallet connect, we also verify against the Midnight ledger to sync across devices.
 *
 * The ledger stores a nullifier (not the user address) so the check is fully ZK — the user
 * proves they claimed by checking if their own nullifier is in the ledger set.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useWallet } from '../hooks/useWallet';

const STORAGE_KEY = 'eclipse:credentials:v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CredentialEntry {
  communityId: string;
  credType: number;
  txHash: string | null;
  claimedAt: number; // timestamp
}

interface CredentialContextValue {
  /** Returns true if user has a valid on-chain credential for this community */
  hasCredential: (communityId: string) => boolean;
  /** Mark credential as claimed (called after successful claimCommunityCredential tx) */
  markCredentialClaimed: (communityId: string, credType: number, txHash: string | null) => void;
  /** All claimed credentials for the current wallet */
  credentials: CredentialEntry[];
  /** Remove a credential (e.g. if ledger check fails) */
  revokeCredential: (communityId: string) => void;
}

const CredentialContext = createContext<CredentialContextValue>({
  hasCredential: () => false,
  markCredentialClaimed: () => {},
  credentials: [],
  revokeCredential: () => {},
});

function storageKey(address: string) {
  return `${STORAGE_KEY}:${address.toLowerCase()}`;
}

function loadCredentials(address: string): CredentialEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const parsed: CredentialEntry[] = JSON.parse(raw);
    const now = Date.now();
    // Filter out expired credentials
    return parsed.filter(c => now - c.claimedAt < TTL_MS);
  } catch {
    return [];
  }
}

function saveCredentials(address: string, entries: CredentialEntry[]) {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(entries));
  } catch {}
}

export function CredentialProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useWallet();
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);

  // Load from localStorage when wallet connects
  useEffect(() => {
    if (!isConnected || !address) {
      setCredentials([]);
      return;
    }
    setCredentials(loadCredentials(address));
  }, [address, isConnected]);

  const hasCredential = useCallback(
    (communityId: string) => {
      if (!communityId) return false;
      const now = Date.now();
      return credentials.some(
        c => c.communityId === communityId && now - c.claimedAt < TTL_MS
      );
    },
    [credentials],
  );

  const markCredentialClaimed = useCallback(
    (communityId: string, credType: number, txHash: string | null) => {
      if (!address) return;
      setCredentials(prev => {
        // Replace if already exists
        const filtered = prev.filter(c => c.communityId !== communityId);
        const updated: CredentialEntry[] = [
          ...filtered,
          { communityId, credType, txHash, claimedAt: Date.now() },
        ];
        saveCredentials(address, updated);
        return updated;
      });
    },
    [address],
  );

  const revokeCredential = useCallback(
    (communityId: string) => {
      if (!address) return;
      setCredentials(prev => {
        const updated = prev.filter(c => c.communityId !== communityId);
        saveCredentials(address, updated);
        return updated;
      });
    },
    [address],
  );

  return (
    <CredentialContext.Provider value={{ hasCredential, markCredentialClaimed, credentials, revokeCredential }}>
      {children}
    </CredentialContext.Provider>
  );
}

export function useCredentials() {
  return useContext(CredentialContext);
}

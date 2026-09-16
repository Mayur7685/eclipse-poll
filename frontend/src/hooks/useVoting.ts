// useVoting — Midnight ZK circuit calls for Eclipse Poll.
// All votes are cast by calling circuits on the master contract via 1AM Wallet.
// The vote choice is NEVER a circuit argument — it is supplied as a witness
// (private state) that the ZK circuit reads internally.

import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import {
  callCircuitOnMasterContract,
  getOrDeployMasterContract,
  getOrCreateUserSecretKey,
} from '../lib/eclipse';
import { markVoted } from '../lib/utils';
import { encryptJSON } from '../lib/submissionCrypto';

const VERIFIER = import.meta.env.VITE_VERIFIER_URL ?? 'http://localhost:4000';

/** Encrypt vote choice and save to server so it survives localStorage clears. */
async function saveEncryptedVote(
  address: string,
  pollId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const ciphertext = await encryptJSON(payload);
    await fetch(`${VERIFIER}/submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address, pollId, ciphertext }),
    });
  } catch {
    // Non-fatal — localStorage copy remains
  }
}
import type { VoteRanking } from '../types';

export type VoteStatus = 'idle' | 'attesting' | 'proving' | 'confirming' | 'done' | 'error';

const PRIVATE_STATE_ID = 'eclipsePollPrivateState';

export function useVoting() {
  const { session, address } = useWallet();
  const [status, setStatus] = useState<VoteStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Update private state before circuit call ───────────────────────────────
  /**
   * Update voteChoice in private state so the witness returns the correct value.
   * The circuit reads voteChoice from witnesses, not from circuit args.
   */
  async function updatePrivateStateVoteChoice(
    contractAddress: string,
    voteChoice: bigint,
    rankedWeights?: bigint[],
  ): Promise<void> {
    if (!session) return;
    const psp = session.providers.privateStateProvider;
    psp.setContractAddress(contractAddress);
    const existing = (await psp.get(PRIVATE_STATE_ID) as any) ?? {
      userSecretKey: getOrCreateUserSecretKey(),
      voteChoice: 0n,
      rankedWeights: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
    };
    const updated = {
      userSecretKey: existing.userSecretKey,
      voteChoice,
      rankedWeights: rankedWeights ?? existing.rankedWeights,
    };
    await psp.set(PRIVATE_STATE_ID, updated);
  }

  // ── Simple / simple single-choice vote ────────────────────────────────────
  const castSimple = useCallback(
    async (
      _contractAddress: string,
      pollIdBytes: Uint8Array,
      selectedIndex: number,
    ) => {
      if (!session || !address) { setError('Wallet not connected'); return; }
      setStatus('proving');
      setError(null);
      setTxHash(null);

      try {
        const masterAddress = await getOrDeployMasterContract(session);
        await updatePrivateStateVoteChoice(masterAddress, BigInt(selectedIndex));

        const result = await callCircuitOnMasterContract(
          session,
          'castBinaryVote',
          [pollIdBytes],
        );

        const resolvedHash = result.txHash ?? null;
        const pollIdHex = Buffer.from(pollIdBytes).toString('hex');
        markVoted(pollIdHex, address);
        void saveEncryptedVote(address, pollIdHex, {
          selectedOption: selectedIndex,
          poll_type: 'simple',
          votedAt: Date.now(),
        });
        setTxHash(resolvedHash);
        setStatus('done');
        return resolvedHash;
      } catch (e: any) {
        console.error('Simple vote failed:', e);
        setError(e.message || String(e));
        setStatus('error');
      }
    },
    [session, address],
  );

  // ── Ranked-choice vote ─────────────────────────────────────────────────────
  const castVote = useCallback(
    async (
      _contractAddress: string,
      pollIdBytes: Uint8Array,
      ranking: VoteRanking,
      optionCount: number,
    ) => {
      if (!session || !address) { setError('Wallet not connected'); return; }
      setStatus('proving');
      setError(null);
      setTxHash(null);

      try {
        const masterAddress = await getOrDeployMasterContract(session);

        const weights: bigint[] = new Array(8).fill(0n);
        for (const [optIdStr, rank] of Object.entries(ranking)) {
          const idx = Number(optIdStr) - 1;
          if (idx >= 0 && idx < 8 && rank > 0) {
            const points = Math.max(0, optionCount - rank + 1);
            weights[idx] = BigInt(Math.min(255, points));
          }
        }

        await updatePrivateStateVoteChoice(masterAddress, 0n, weights);

        const result = await callCircuitOnMasterContract(
          session,
          'castRankedVote',
          [pollIdBytes],
        );

        const resolvedHash = result.txHash ?? null;
        const pollIdHex2 = Buffer.from(pollIdBytes).toString('hex');
        markVoted(pollIdHex2, address);
        void saveEncryptedVote(address, pollIdHex2, {
          ranking,
          poll_type: 'ranked',
          votedAt: Date.now(),
        });
        setTxHash(resolvedHash);
        setStatus('done');
        return resolvedHash;
      } catch (e: any) {
        console.error('Ranked vote failed:', e);
        setError(e.message || String(e));
        setStatus('error');
      }
    },
    [session, address],
  );

  // ── Survey vote ─────────────────────────────────────────────────────────────
  const castSurvey = useCallback(
    async (
      pollIdBytes: Uint8Array,
      answersFlat: number[],
    ) => {
      if (!session || !address) { setError('Wallet not connected'); return; }
      setStatus('proving');
      setError(null);
      setTxHash(null);

      try {
        const masterAddress = await getOrDeployMasterContract(session);

        const weights: bigint[] = new Array(8).fill(0n);
        answersFlat.slice(0, 8).forEach((ansIdx, i) => {
          weights[i] = BigInt(Math.min(255, ansIdx + 1));
        });

        await updatePrivateStateVoteChoice(masterAddress, BigInt(answersFlat[0] ?? 0), weights);

        const result = await callCircuitOnMasterContract(
          session,
          'castRankedVote',
          [pollIdBytes],
        );

        const resolvedHash = result.txHash ?? null;
        markVoted(Buffer.from(pollIdBytes).toString('hex'), address);
        setTxHash(resolvedHash);
        setStatus('done');
        return resolvedHash;
      } catch (e: any) {
        console.error('Survey vote failed:', e);
        setError(e.message || String(e));
        setStatus('error');
      }
    },
    [session, address],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, []);

  return {
    castVote,
    castSimple,
    castSurvey,
    status,
    txHash,
    error,
    reset,
    isEncrypting: status === 'proving', // keep compat with old FHEpoll name
  };
}

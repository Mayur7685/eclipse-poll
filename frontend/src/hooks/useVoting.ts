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
  createInitialPrivateState,
} from '../lib/eclipse';
import { markVoted } from '../lib/utils';
import { encryptJSON } from '../lib/submissionCrypto';
import { fromHex } from '../lib/midnight';

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

  // ── Approval vote — select all that apply ─────────────────────────────────
  const castApproval = useCallback(
    async (
      _contractAddress: string,
      pollIdBytes: Uint8Array,
      approvedIndices: number[],  // indices of approved options (0-based)
    ) => {
      if (!session || !address) { setError('Wallet not connected'); return; }
      setStatus('proving');
      setError(null);
      setTxHash(null);

      try {
        const masterAddress = await getOrDeployMasterContract(session);
        const psp = session.providers.privateStateProvider;
        psp.setContractAddress(masterAddress);
        const existing = (await psp.get(PRIVATE_STATE_ID) as any) ?? {
          userSecretKey: getOrCreateUserSecretKey(),
          voteChoice: 0n,
          rankedWeights: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
        };
        // Build boolean approval vector
        const approvalChoices = Array(8).fill(false);
        approvedIndices.forEach(idx => { if (idx >= 0 && idx < 8) approvalChoices[idx] = true; });
        await psp.set(PRIVATE_STATE_ID, { ...existing, approvalChoices });

        const result = await callCircuitOnMasterContract(
          session,
          'castApprovalVote',
          [pollIdBytes],
        );

        const resolvedHash = result.txHash ?? null;
        const pollIdHex = Buffer.from(pollIdBytes).toString('hex');
        markVoted(pollIdHex, address);
        void saveEncryptedVote(address, pollIdHex, {
          approvedIndices,
          poll_type: 'approval',
          votedAt: Date.now(),
        });
        setTxHash(resolvedHash);
        setStatus('done');
        return resolvedHash;
      } catch (e: any) {
        console.error('Approval vote failed:', e);
        setError(e.message || String(e));
        setStatus('error');
      }
    },
    [session, address],
  );

  // ── Hierarchical ranked vote (MDCT) ───────────────────────────────────────
  // layerRankings: Map<parentId, VoteRanking> — rankings per layer
  // Options structure: { option_id, parent_option_id } determines tree shape
  const castHierarchical = useCallback(
    async (
      _contractAddress: string,
      pollIdBytes: Uint8Array,
      layerRankings: Map<number, Record<string, number>>,
      options: { option_id: number; parent_option_id: number }[],
    ) => {
      if (!session || !address) { setError('Wallet not connected'); return; }
      setStatus('proving');
      setError(null);
      setTxHash(null);
      try {
        const masterAddress = await getOrDeployMasterContract(session);
        const psp = session.providers.privateStateProvider;
        psp.setContractAddress(masterAddress);
        const existing = (await psp.get(PRIVATE_STATE_ID) as any) ?? {
          userSecretKey: getOrCreateUserSecretKey(),
          voteChoice: 0n, rankedWeights: [0n,0n,0n,0n,0n,0n,0n,0n],
        };

        // Build layer arrays from the layer rankings map
        // Each entry: layerWeights[layerIdx][optIdx] = Borda weight
        // layerParents[layerIdx] = parentId for that layer
        const layerWeightsArr: bigint[][] = Array(4).fill(null).map(() => Array(8).fill(0n));
        const layerParentsArr: bigint[] = [0n, 0n, 0n, 0n];

        let layerIdx = 0;
        for (const [parentId, ranking] of layerRankings.entries()) {
          if (layerIdx >= 4) break;
          layerParentsArr[layerIdx] = BigInt(parentId);
          // Get options that belong to this parent
          const siblings = options.filter(o => o.parent_option_id === parentId);
          const optionCount = siblings.length;
          for (const [optIdStr, rank] of Object.entries(ranking)) {
            const optId = Number(optIdStr);
            // Find 0-based index within siblings
            const sibIdx = siblings.findIndex(s => s.option_id === optId);
            if (sibIdx >= 0 && sibIdx < 8 && rank > 0) {
              const points = Math.max(0, optionCount - rank + 1);
              layerWeightsArr[layerIdx][sibIdx] = BigInt(Math.min(255, points));
            }
          }
          layerIdx++;
        }

        await psp.set(PRIVATE_STATE_ID, {
          ...existing,
          layerWeights: layerWeightsArr,
          layerParents: layerParentsArr,
        });

        const result = await callCircuitOnMasterContract(session, 'castHierarchicalVote', [pollIdBytes]);
        const resolvedHash = result.txHash ?? null;
        const pollIdHex = Buffer.from(pollIdBytes).toString('hex');
        markVoted(pollIdHex, address);
        void saveEncryptedVote(address, pollIdHex, {
          layerRankings: Object.fromEntries(layerRankings),
          poll_type: 'hierarchical',
          votedAt: Date.now(),
        });
        setTxHash(resolvedHash);
        setStatus('done');
        return resolvedHash;
      } catch (e: any) {
        console.error('Hierarchical vote failed:', e);
        setError(e.message || String(e));
        setStatus('error');
      }
    },
    [session, address],
  );


  // ── Credentialed votes (Schnorr on-chain attestation) ─────────────────────
  // These call the attestation API first to get a Schnorr sig, then supply
  // it as a private witness to the credentialed circuit.

  async function getAttestationFromAPI(
    communityId: string,
    pollIdBytes: Uint8Array,
    address: string,
    connectedAccounts: any[] = [],
  ): Promise<{ sig: any; credType: bigint } | null> {
    const VERIFIER = import.meta.env.VITE_VERIFIER_URL ?? 'http://localhost:4000';
    const pollIdHex = '0x' + Buffer.from(pollIdBytes).toString('hex');
    try {
      const res = await fetch(`${VERIFIER}/verify/credential-params`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ communityId, evmAddress: address, connectedAccounts, pollIdHash: pollIdHex, userPubKeyHash: address }),
      });
      const data = await res.json();
      if (!data.passed || !data.attestation) return null;
      const { attestation } = data;
      return {
        sig: {
          announcement: {
            x: BigInt(attestation.announcement.x),
            y: BigInt(attestation.announcement.y),
          },
          response: BigInt(attestation.response),
        },
        credType: BigInt(attestation.credType ?? 1),
      };
    } catch {
      return null;
    }
  }

  const castCredentialedSimple = useCallback(
    async (
      _contractAddress: string,
      pollIdBytes: Uint8Array,
      selectedIndex: number,
      communityId: string,
      connectedAccounts: any[] = [],
    ) => {
      if (!session || !address) { setError('Wallet not connected'); return; }
      setStatus('attesting');
      setError(null);
      setTxHash(null);

      try {
        // 1. Get Schnorr attestation from API
        const attestResult = await getAttestationFromAPI(communityId, pollIdBytes, address, connectedAccounts);
        if (!attestResult) { setError('Credential verification failed. Check your eligibility.'); setStatus('error'); return; }

        // 2. Set private state with attestation + vote choice
        const masterAddress = await getOrDeployMasterContract(session);
        const psp = session.providers.privateStateProvider;
        psp.setContractAddress(masterAddress);
        const existing = (await psp.get(PRIVATE_STATE_ID) as any) ?? { userSecretKey: getOrCreateUserSecretKey(), voteChoice: 0n, rankedWeights: [0n,0n,0n,0n,0n,0n,0n,0n] };
        await psp.set(PRIVATE_STATE_ID, {
          ...existing,
          voteChoice: BigInt(selectedIndex),
          attestationSignature: attestResult.sig,
          attestationCredType: attestResult.credType,
          attestationPollId: pollIdBytes,
        });

        setStatus('proving');
        const result = await callCircuitOnMasterContract(session, 'castCredentialedBinaryVote', [pollIdBytes]);
        const resolvedHash = result.txHash ?? null;
        const pollIdHex = Buffer.from(pollIdBytes).toString('hex');
        markVoted(pollIdHex, address);
        void saveEncryptedVote(address, pollIdHex, { selectedOption: selectedIndex, poll_type: 'simple', votedAt: Date.now() });
        setTxHash(resolvedHash);
        setStatus('done');
        return resolvedHash;
      } catch (e: any) {
        console.error('Credentialed vote failed:', e);
        setError(e.message || String(e));
        setStatus('error');
      }
    },
    [session, address],
  );

  const castCredentialedRanked = useCallback(
    async (
      _contractAddress: string,
      pollIdBytes: Uint8Array,
      ranking: VoteRanking,
      optionCount: number,
      communityId: string,
      connectedAccounts: any[] = [],
    ) => {
      if (!session || !address) { setError('Wallet not connected'); return; }
      setStatus('attesting');
      setError(null);
      setTxHash(null);

      try {
        const attestResult = await getAttestationFromAPI(communityId, pollIdBytes, address, connectedAccounts);
        if (!attestResult) { setError('Credential verification failed.'); setStatus('error'); return; }

        const masterAddress = await getOrDeployMasterContract(session);
        const psp = session.providers.privateStateProvider;
        psp.setContractAddress(masterAddress);
        const existing = (await psp.get(PRIVATE_STATE_ID) as any) ?? { userSecretKey: getOrCreateUserSecretKey(), voteChoice: 0n, rankedWeights: [0n,0n,0n,0n,0n,0n,0n,0n] };

        const weights: bigint[] = new Array(8).fill(0n);
        for (const [optIdStr, rank] of Object.entries(ranking)) {
          const idx = Number(optIdStr) - 1;
          if (idx >= 0 && idx < 8 && rank > 0) {
            weights[idx] = BigInt(Math.min(255, Math.max(0, optionCount - rank + 1)));
          }
        }
        await psp.set(PRIVATE_STATE_ID, {
          ...existing,
          rankedWeights: weights,
          attestationSignature: attestResult.sig,
          attestationCredType: attestResult.credType,
          attestationPollId: pollIdBytes,
        });

        setStatus('proving');
        const result = await callCircuitOnMasterContract(session, 'castCredentialedRankedVote', [pollIdBytes]);
        const resolvedHash = result.txHash ?? null;
        const pollIdHex = Buffer.from(pollIdBytes).toString('hex');
        markVoted(pollIdHex, address);
        void saveEncryptedVote(address, pollIdHex, { ranking, poll_type: 'ranked', votedAt: Date.now() });
        setTxHash(resolvedHash);
        setStatus('done');
        return resolvedHash;
      } catch (e: any) {
        console.error('Credentialed ranked vote failed:', e);
        setError(e.message || String(e));
        setStatus('error');
      }
    },
    [session, address],
  );

  const claimCommunityCredential = useCallback(
    async (
      communityId: string,
      connectedAccounts: any[] = [],
    ): Promise<{ txHash: string | null } | null> => {
      if (!session || !address) { setError('Wallet not connected'); return null; }
      setStatus('attesting');
      setError(null);
      setTxHash(null);

      try {
        const VERIFIER = import.meta.env.VITE_VERIFIER_URL ?? 'http://localhost:4000';
        // communityId is a hex string like '0x000...42da4f9c' — must use fromHex to get the same
        // bytes that were passed to registerCommunity on-chain
        const communityIdBytes = fromHex(communityId.replace(/^0x/, '').padStart(64, '0'));
        const communityIdHex = '0x' + Buffer.from(communityIdBytes).toString('hex');

        // Get Schnorr attestation for community (pollIdHash = communityId hash)
        const res = await fetch(`${VERIFIER}/verify/credential-params`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            communityId,
            evmAddress: address,
            connectedAccounts,
            pollIdHash: communityIdHex,
            userPubKeyHash: address,
          }),
        });
        const data = await res.json();
        if (!data.passed || !data.attestation) {
          setError('Credential verification failed. Check your eligibility.');
          setStatus('error');
          return null;
        }

        const sig = {
          announcement: {
            x: BigInt(data.attestation.announcement.x),
            y: BigInt(data.attestation.announcement.y),
          },
          response: BigInt(data.attestation.response),
        };
        const credType = BigInt(data.attestation.credType ?? 1);

        // Set private state with community attestation
        const masterAddress = await getOrDeployMasterContract(session);
        const psp = session.providers.privateStateProvider;
        psp.setContractAddress(masterAddress);
        const existing = (await psp.get(PRIVATE_STATE_ID) as any) ?? createInitialPrivateState();
        await psp.set(PRIVATE_STATE_ID, {
          ...existing,
          attestationSignature: sig,
          attestationCredType: credType,
          attestationPollId: communityIdBytes,
        });

        setStatus('proving');
        const result = await callCircuitOnMasterContract(session, 'claimCommunityCredential', [communityIdBytes]);
        const resolvedHash = result.txHash ?? null;
        setTxHash(resolvedHash);
        setStatus('done');
        return { txHash: resolvedHash };
      } catch (e: any) {
        console.error('Claim community credential failed:', e);
        setError(e.message || String(e));
        setStatus('error');
        return null;
      }
    },
    [session, address],
  );

  return {
    castVote,
    castSimple,
    castSurvey,
    castApproval,
    castHierarchical,
    castCredentialedSimple,
    castCredentialedRanked,
    claimCommunityCredential,
    status,
    txHash,
    error,
    reset,
    isEncrypting: status === 'proving',
  };
}

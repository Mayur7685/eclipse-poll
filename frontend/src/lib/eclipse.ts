import {
  Contract,
  witnesses,
  PollType,
  CredentialType,
  ledger,
  type EclipsePollPrivateState,
  CompiledEclipsePollContract,
} from 'eclipse-poll-contract';
import {
  createUnprovenDeployTx,
  submitTxAsync,
  submitCallTxAsync,
  findDeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import * as CompiledContractModule from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import type { ConnectedSession } from './midnight.js';

export { PollType, CredentialType };

const PRIVATE_STATE_ID = 'eclipsePollPrivateState';
const MASTER_CONTRACT_KEY = 'midnight:master_contract_v3';

export function getStoredMasterContractAddress(): string | null {
  const addr = localStorage.getItem(MASTER_CONTRACT_KEY) || import.meta.env.VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS || null;
  return addr && addr.trim().length > 0 ? addr.trim() : null;
}

export function setStoredMasterContractAddress(address: string): void {
  localStorage.setItem(MASTER_CONTRACT_KEY, address);
}

export function clearStoredMasterContractAddress(): void {
  localStorage.removeItem(MASTER_CONTRACT_KEY);
}

function getCompiledContract() {
  const base = (CompiledContractModule as any).make('eclipse_poll', Contract as any);
  if ((CompiledContractModule as any).withWitnesses && witnesses) {
    return (CompiledContractModule as any).withWitnesses(base, witnesses as any);
  }
  return base;
}

const USER_SECRET_KEY = 'eclipse:userSecretKey:v1';

/**
 * Get or create the user's secret key.
 * Persisted in localStorage so the same key is used across page refreshes.
 * This is critical — the contractAdmin on-chain is derived from this key.
 * If it changes, admin circuits (registerAttestationProvider) will fail with "Only admin".
 */
export function getOrCreateUserSecretKey(): Uint8Array {
  try {
    const stored = localStorage.getItem(USER_SECRET_KEY);
    if (stored) {
      const bytes = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      if (bytes.length === 32) return bytes;
    }
  } catch { /* corrupt — regenerate */ }

  const sk = window.crypto.getRandomValues(new Uint8Array(32));
  try {
    localStorage.setItem(USER_SECRET_KEY, btoa(String.fromCharCode(...sk)));
  } catch { /* storage full — non-fatal, key won't persist */ }
  return sk;
}





export function createInitialPrivateState(userSecretKey?: Uint8Array): EclipsePollPrivateState {
  const sk = userSecretKey ?? getOrCreateUserSecretKey();
  return {
    userSecretKey: sk,
    voteChoice: 0n,
    rankedWeights: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
  };
}

const INDEXER_URL = () =>
  (import.meta.env.VITE_MIDNIGHT_INDEXER_URI as string) ||
  'https://indexer.preprod.midnight.network/api/v4/graphql';

/** Query the indexer for the latest tx hash on a contract */
async function getLatestContractTxHash(contractAddress: string): Promise<string | null> {
  try {
    const res = await fetch(INDEXER_URL(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ contractAction(address: "${contractAddress}") { transaction { hash } } }`,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.contractAction?.transaction?.hash ?? null;
  } catch {
    return null;
  }
}

/**
 * Poll the indexer until a NEW tx hash appears for the contract.
 * Snapshot the current hash before submission, then poll until it changes.
 */
export async function waitForNewTx(
  contractAddress: string,
  previousHash: string | null,
  maxAttempts = 20,
  delayMs = 3000,
): Promise<string | null> {
  console.log(`[waitForNewTx] Waiting for new tx on ${contractAddress.slice(0, 12)}... (prev: ${previousHash?.slice(0, 12) ?? 'none'})`);
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const hash = await getLatestContractTxHash(contractAddress);
    if (hash && hash !== previousHash) {
      console.log(`[waitForNewTx] New tx confirmed: ${hash}`);
      return hash;
    }
    console.log(`[waitForNewTx] Attempt ${i + 1}/${maxAttempts} — no new tx yet`);
  }
  console.warn(`[waitForNewTx] Timed out after ${maxAttempts} attempts`);
  return null;
}

export async function waitForContractIndexing(
  session: ConnectedSession,
  contractAddress: string,
  maxAttempts = 15,
  delayMs = 2000,
): Promise<boolean> {
  console.log(`Waiting for Midnight indexer to index contract ${contractAddress}...`);
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const state = await session.providers.publicDataProvider.queryContractState(contractAddress);
      if (state) {
        console.log(`Contract ${contractAddress} is indexed and ready!`);
        return true;
      }
    } catch {
      // Indexer catching up
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  console.warn(`Timed out waiting for indexer on ${contractAddress}, proceeding...`);
  return false;
}

export async function deployEclipsePollContract(
  session: ConnectedSession,
  initialPrivateState = createInitialPrivateState(),
) {
  try {
    const compiled = getCompiledContract();
    const deployTxData = await (createUnprovenDeployTx as any)(
      session.providers,
      {
        compiledContract: compiled,
        args: [],
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState,
        signingKey: sampleSigningKey(),
      },
    );

    const contractAddress = deployTxData.public.contractAddress;
    await (submitTxAsync as any)(session.providers, { unprovenTx: deployTxData.private.unprovenTx });
    await session.providers.privateStateProvider.setContractAddress(contractAddress);
    await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, initialPrivateState);
    await session.providers.privateStateProvider.setSigningKey(
      contractAddress,
      deployTxData.private.signingKey,
    );

    setStoredMasterContractAddress(contractAddress);
    await waitForContractIndexing(session, contractAddress);

    // Resolve the real deploy tx hash from the indexer
    let deployTxHash = contractAddress; // fallback
    try {
      const INDEXER = import.meta.env.VITE_MIDNIGHT_INDEXER_URI as string
        ?? 'https://indexer.preprod.midnight.network/api/v4/graphql';
      const res = await fetch(INDEXER, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: `{ contractAction(address: "${contractAddress}") { transaction { hash } } }`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const hash = data?.data?.contractAction?.transaction?.hash;
        if (hash) deployTxHash = hash;
      }
    } catch { /* use fallback */ }

    return {
      deployTx: { contractAddress, txHash: deployTxHash },
      callTx: {
        registerCommunity: async (communityId: Uint8Array, configHash: Uint8Array, credType: number) => {
          return (submitCallTxAsync as any)(session.providers, {
            compiledContract: compiled,
            contractAddress,
            circuitId: 'registerCommunity',
            args: [communityId, configHash, credType],
            privateStateId: PRIVATE_STATE_ID,
          });
        },
        createPoll: async (pollId: Uint8Array, pollType: number, credType: number, optionCount: bigint, endTime: bigint) => {
          return (submitCallTxAsync as any)(session.providers, {
            compiledContract: compiled,
            contractAddress,
            circuitId: 'createPoll',
            args: [pollId, pollType, credType, optionCount, endTime],
            privateStateId: PRIVATE_STATE_ID,
          });
        },
        castBinaryVote: async (pollId: Uint8Array, secretPin: number) => {
          return (submitCallTxAsync as any)(session.providers, {
            compiledContract: compiled,
            contractAddress,
            circuitId: 'castBinaryVote',
            args: [pollId, secretPin],
            privateStateId: PRIVATE_STATE_ID,
          });
        },
        castRankedVote: async (pollId: Uint8Array, secretPin: number) => {
          return (submitCallTxAsync as any)(session.providers, {
            compiledContract: compiled,
            contractAddress,
            circuitId: 'castRankedVote',
            args: [pollId, secretPin],
            privateStateId: PRIVATE_STATE_ID,
          });
        },
        closePoll: async (pollId: Uint8Array) => {
          return (submitCallTxAsync as any)(session.providers, {
            compiledContract: compiled,
            contractAddress,
            circuitId: 'closePoll',
            args: [pollId],
            privateStateId: PRIVATE_STATE_ID,
          });
        },
      },
    };
  } catch (err: any) {
    console.error('Midnight contract deployment error:', err);
    throw err;
  }
}

export async function getOrDeployMasterContract(session: ConnectedSession): Promise<string> {
  let masterAddress = getStoredMasterContractAddress();
  if (!masterAddress) {
    const deployed = await deployEclipsePollContract(session);
    masterAddress = deployed.deployTx.contractAddress;
    setStoredMasterContractAddress(masterAddress);
  }
  return masterAddress;
}

export async function callCircuitOnMasterContract(
  session: ConnectedSession,
  circuitId: string,
  args: any[],
  onProgress?: (status: string) => void,
) {
  console.log(`[callCircuitOnMasterContract] Invoking circuit '${circuitId}' with args:`, args);
  onProgress?.('Step 1/4: Verifying master contract indexing on Midnight GraphQL indexer...');

  const masterAddress = await getOrDeployMasterContract(session);
  const compiled = getCompiledContract();

  await waitForContractIndexing(session, masterAddress);

  onProgress?.('Step 2/4: Generating Zero-Knowledge Proof (this takes ~10–20s)...');

  await session.providers.privateStateProvider.setContractAddress(masterAddress);
  const existingState = await session.providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (!existingState) {
    await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, createInitialPrivateState());
  }

  // Wrap submitCallTxAsync to track ZK proving vs wallet signature phase
  onProgress?.('Step 3/4: ZK Proof ready! Requesting 1AM Wallet signature — please check your extension!');

  // Snapshot the current latest tx BEFORE submission so we can detect the new one
  const previousTxHash = await getLatestContractTxHash(masterAddress);

  const txData = await (submitCallTxAsync as any)(session.providers, {
    compiledContract: compiled,
    contractAddress: masterAddress,
    circuitId,
    args,
    privateStateId: PRIVATE_STATE_ID,
  });

  onProgress?.('Step 4/4: Transaction submitted — waiting for indexer confirmation...');
  console.log(`[callCircuitOnMasterContract] Circuit '${circuitId}' submitted, txId:`, txData?.txId);

  // Poll indexer until a new tx hash appears (different from the snapshot)
  const newTxHash = await waitForNewTx(masterAddress, previousTxHash);

  if (newTxHash) {
    console.log(`[callCircuitOnMasterContract] Resolved tx hash: ${newTxHash}`);
  }

  return {
    txData,
    contractAddress: masterAddress,
    txHash: newTxHash, // real confirmed tx hash, or null if indexer timed out
  };
}

export async function joinEclipsePollContract(
  session: ConnectedSession,
  contractAddress: string,
  initialPrivateState = createInitialPrivateState(),
) {
  const contractInstance = new Contract(witnesses);
  const joined = await findDeployedContract(session.providers, {
    contractAddress,
    contract: contractInstance,
    privateStateKey: PRIVATE_STATE_ID,
    initialPrivateState,
  });
  return joined;
}

export async function fetchContractLedger(
  session: ConnectedSession,
  contractAddress: string,
) {
  const contractState = await session.providers.publicDataProvider.queryContractState(contractAddress);
  if (!contractState) return null;
  return ledger(contractState.data);
}

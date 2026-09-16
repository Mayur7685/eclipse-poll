/**
 * Eclipse Poll — Master Contract Deploy Script
 * Targets: Midnight preprod (headless Node.js wallet)
 *
 * Usage:
 *   WALLET_SEED=0x<64-hex-chars> npx tsx scripts/deploy-master.ts
 *   — or —
 *   source .deploy-seed && npx tsx scripts/deploy-master.ts
 */

import { WebSocket } from 'ws';
globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

import { Buffer } from 'buffer';
import * as Rx from 'rxjs';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { HDWallet, generateRandomSeed, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  UnshieldedWallet, createKeystore, PublicKey,
  InMemoryTransactionHistoryStorage,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

// ── Config ───────────────────────────────────────────────────────────────────
const NETWORK_ID       = 'preprod' as const;
const INDEXER_HTTP     = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const INDEXER_WS       = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const RPC              = 'https://rpc.preprod.midnight.network';
const PROOF_SERVER     = 'http://127.0.0.1:6300';
const PRIVATE_STATE_ID = 'eclipsePollPrivateState';
const PRIVATE_STATE_STORE = 'eclipse-poll-deploy-state';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ZK_CONFIG_PATH = path.resolve(__dirname, '../contract/src/managed/eclipse_poll');

// ── Wallet seed ──────────────────────────────────────────────────────────────
const seedHex = process.env.WALLET_SEED;
if (!seedHex) {
  const fresh = '0x' + Buffer.from(generateRandomSeed()).toString('hex');
  console.log('\n⚠️  No WALLET_SEED set. Generated a new one:');
  console.log(`   WALLET_SEED=${fresh}`);
  console.log('\n   Fund the address above at: https://faucet.preprod.midnight.network');
  console.log('   Then re-run with the seed.\n');
  process.exit(0);
}
const seed = Buffer.from(seedHex.replace(/^0x/, ''), 'hex');

// ── Wallet setup ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🌑 Eclipse Poll — Master Contract Deploy\n');
  console.log(`Network:      ${NETWORK_ID}`);
  console.log(`Indexer:      ${INDEXER_HTTP}`);
  console.log(`Proof server: ${PROOF_SERVER}`);
  console.log(`ZK assets:    ${ZK_CONFIG_PATH}\n`);

  // 1. Verify ZK assets exist
  if (!fs.existsSync(path.join(ZK_CONFIG_PATH, 'keys'))) {
    console.error('❌ ZK assets missing. Run: npm run build:contract && npm run sync:zk');
    process.exit(1);
  }

  // 2. Network ID
  setNetworkId(NETWORK_ID);

  // 3. HD key derivation
  const hdWallet = HDWallet.fromSeed(seed);
  if (hdWallet.type !== 'seedOk') throw new Error('Invalid wallet seed');

  const derivation = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivation.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();

  const keys = derivation.keys;
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey      = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], NETWORK_ID);
  const unshieldedAddress  = unshieldedKeystore.getBech32Address().toString();

  console.log(`Unshielded address: ${unshieldedAddress}`);
  console.log('(Fund at https://faucet.preprod.midnight.network if balance is 0)\n');

  // 4. Shared wallet configuration
  const walletConfig = {
    networkId: NETWORK_ID,
    indexerClientConnection: {
      indexerHttpUrl: INDEXER_HTTP,
      indexerWsUrl:   INDEXER_WS,
    },
    provingServerUrl: new URL(PROOF_SERVER),
    relayURL: new URL('wss://rpc.preprod.midnight.network'), // capital URL — required by wallet-sdk-capabilities
  };

  // 5. Build wallet via WalletFacade.init (v3 pattern)
  // Each factory function receives the shared config and must return a STARTED wallet instance.
  console.log('⏳ Initializing wallet...');

  const walletFacade = await WalletFacade.init({
    configuration: walletConfig,
    shielded: (cfg: any) =>
      ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg: any) =>
      UnshieldedWallet({
        ...cfg,
        txHistoryStorage: new InMemoryTransactionHistoryStorage(),
      }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg: any) =>
      DustWallet(cfg).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      ),
  });

  // 6. Wait for all three sub-wallets to sync
  console.log('⏳ Syncing with preprod (up to 2 min)...');
  const syncedState: any = await walletFacade.waitForSyncedState();
  console.log('✅ Wallet synced');
  console.log('syncedState keys:', Object.keys(syncedState ?? {}));

  // 8. Check NIGHT balance
  const { unshieldedToken } = ledger as any;
  const tokenRaw = typeof unshieldedToken === 'function' ? unshieldedToken().raw : 'night';
  const nightBalance = syncedState?.unshielded?.balances?.[tokenRaw] ?? 0n;
  console.log(`NIGHT balance: ${nightBalance}`);

  if (nightBalance === 0n) {
    console.error(`\n❌ No NIGHT tokens. Fund: ${unshieldedAddress}`);
    console.error('   Faucet: https://faucet.preprod.midnight.network\n');
    process.exit(1);
  }

  // 9. Register NIGHT for DUST if needed
  const dustBalance = syncedState?.dust?.availableCoins?.length > 0 ? 1n : 0n;
  console.log(`DUST coins available: ${syncedState?.dust?.availableCoins?.length ?? 0}`);

  if (dustBalance === 0n) {
    console.log('\n⏳ Registering NIGHT UTXOs for DUST generation...');
    const unregistered = (syncedState?.unshielded?.availableCoins ?? []).filter(
      (coin: any) => !coin.meta?.registeredForDustGeneration,
    );

    if (unregistered.length > 0) {
      // v3 API: createDustActionTransaction
      const dustTx = await walletFacade.createDustActionTransaction(
        { type: 'registration', dustReceiverAddress: undefined } as any,
        unregistered,
        undefined,
        (payload: Uint8Array) => unshieldedKeystore.signData(payload),
      );
      const balancedTx = await walletFacade.balanceFinalizedTransaction(
        dustTx,
        { shieldedSecretKeys, dustSecretKey },
        { ttl: new Date(Date.now() + 30 * 60_000) },
      );
      await walletFacade.submitTransaction(balancedTx);
      console.log('✅ DUST registration submitted. Waiting for DUST to accrue (~2-5 min)...');
    } else {
      console.log('ℹ️  UTXOs already registered. Waiting for DUST...');
    }

    // Poll until DUST is available
    let dustReady = false;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 10_000));
      const s: any = await walletFacade.waitForSyncedState();
      if ((s?.dust?.availableCoins?.length ?? 0) > 0) {
        dustReady = true;
        break;
      }
      process.stdout.write('.');
    }
    console.log('');
    if (!dustReady) {
      console.warn('⚠️  DUST still not available after 10 min. Trying deploy anyway...');
    } else {
      console.log('✅ DUST available');
    }
  } else {
    console.log('✅ DUST already available');
  }

  // 9. Build providers
  // signTransactionIntents workaround (wallet SDK bug)
  const signFn = (payload: Uint8Array) => unshieldedKeystore.signData(payload);

  function signTransactionIntents(tx: any, sfn: any, proofMarker: string) {
    if (!tx?.intents?.size) return;
    for (const segment of tx.intents.keys()) {
      const intent = tx.intents.get(segment);
      if (!intent) continue;
      try {
        const cloned = ledger.Intent.deserialize(
          'signature', proofMarker as any, 'pre-binding', intent.serialize()
        );
        const sig = sfn(cloned.signatureData(segment));
        if (cloned.fallibleUnshieldedOffer) {
          const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
            (_: any, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? sig,
          );
          cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
        }
        if (cloned.guaranteedUnshieldedOffer) {
          const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
            (_: any, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? sig,
          );
          cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
        }
        tx.intents.set(segment, cloned);
      } catch { /* skip — intent format not applicable */ }
    }
  }

  const freshState: any = await walletFacade.waitForSyncedState();

  const walletAndMidnightProvider: WalletProvider & MidnightProvider = {
    getCoinPublicKey() {
      return freshState?.shielded?.coinPublicKey?.toHexString?.()
        ?? freshState?.shielded?.state?.coinPublicKey?.toHexString?.()
        ?? '';
    },
    getEncryptionPublicKey() {
      return freshState?.shielded?.encryptionPublicKey?.toHexString?.()
        ?? freshState?.shielded?.state?.encryptionPublicKey?.toHexString?.()
        ?? '';
    },
    async balanceTx(tx: any, ttl?: Date) {
      // v3: balanceFinalizedTransaction (for proven unbound transactions)
      const balanced = await walletFacade.balanceFinalizedTransaction(
        tx,
        { shieldedSecretKeys, dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return balanced;
    },
    async submitTx(tx: any) {
      return walletFacade.submitTransaction(tx) as any;
    },
  };

  const zkConfigProvider = new NodeZkConfigProvider(ZK_CONFIG_PATH);
  const proofProvider    = httpClientProofProvider(new URL(PROOF_SERVER), zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(INDEXER_HTTP, INDEXER_WS);

  const privateStateProv = levelPrivateStateProvider({
    privateStateStoreName: PRIVATE_STATE_STORE,
    walletProvider: walletAndMidnightProvider,
  });

  const providers = {
    privateStateProvider:  privateStateProv,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider:    walletAndMidnightProvider,
    midnightProvider:  walletAndMidnightProvider,
  };

  // 10. Import compiled contract
  const contractModule    = await import('eclipse-poll-contract');
  const { Contract, witnesses } = contractModule;
  const compactJsMod      = await import('@midnight-ntwrk/compact-js/effect/CompiledContract') as any;

  let compiledContract = compactJsMod.make('eclipse_poll', Contract as any);
  if (compactJsMod.withWitnesses && witnesses) {
    compiledContract = compactJsMod.withWitnesses(compiledContract, witnesses as any);
  }

  // 11. Deploy
  console.log('\n🚀 Deploying Eclipse Poll master contract...');
  console.log('   ZK proof generation: ~30-120s\n');

  const initialPrivateState = {
    userSecretKey:           crypto.getRandomValues(new Uint8Array(32)),
    voteChoice:              0n,
    rankedWeights:           [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
    attestationSignature:    null,
    attestationCredType:     0n,
    attestationPollId:       new Uint8Array(32),
  };

  const deployed = await deployContract(providers as any, {
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState,
  });

  const contractAddress = (deployed as any).deployTxData.public.contractAddress;

  console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY\n');
  console.log('━'.repeat(60));
  console.log(`Contract address: ${contractAddress}`);
  console.log('━'.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Add to frontend/.env:');
  console.log(`     VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS=${contractAddress}`);
  console.log('  2. Start attestation API and open /admin/setup in the browser');
  console.log('     to register the attestation provider on-chain.\n');

  // Save to file
  fs.writeFileSync(
    path.resolve(__dirname, '../.deployed-address'),
    `VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS=${contractAddress}\n`,
  );
  console.log('📄 Address saved to .deployed-address\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Deploy failed:', err?.message ?? err);
  console.error(err?.stack ?? '');
  process.exit(1);
});

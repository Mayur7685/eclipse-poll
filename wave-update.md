# Eclipse Poll — Wave Update

Eclipse Poll is a privacy-first governance dApp built on Midnight Network using Compact zero-knowledge smart contracts. Individual votes are never revealed — only aggregate tallies are published on-chain. Live on Midnight Preprod.

**Contract:** `06fc9596f1c12928bd7904f927b995bf727713fa292679b300900ae607b1ba2f`
**Demo:** [eclipse-poll.vercel.app](https://eclipse-poll.vercel.app)
**API:** [eclipse-poll-api-h0a8.onrender.com](https://eclipse-poll-api-h0a8.onrender.com)
**Explorer:** [explorer.1am.xyz/contract/06fc9596...](https://explorer.1am.xyz/contract/06fc9596f1c12928bd7904f927b995bf727713fa292679b300900ae607b1ba2f?network=preprod)

---

## What Was Delivered

### 1. ZK Voting on Midnight Network — Compact Smart Contract

`castBinaryVote(pollId)` and `castRankedVote(pollId)` circuits prove vote validity without revealing the choice. The vote choice is a private witness — only the tally counter is incremented on-chain. Anti-double-vote is enforced via `nullifiers: Set<Nullifier>` where `nullifier = persistentHash(userSecretKey, pollId)` — the set proves uniqueness without revealing voter identity.

`createPoll(pollId, pollType, credType, optionCount, endTime)` registers the poll and pre-initializes all 8 tally counter slots. `registerCommunity(communityId, configHash, credType)` anchors community metadata on-chain with an IPFS config hash. All circuit arguments are typed Compact `Bytes<32>`, `PollType` enum, and `Uint<8>` — type-safe at the ZK level.

ZK proof generation happens **in-browser via WASM** using the 1AM Wallet's proving provider. No server-side proving. Proof time: 10–20s depending on circuit complexity.

### 2. Poll Types — Simple and Ranked Choice

**Simple Poll** (`PollType.SIMPLE`) — single option selection. `getVoteChoice()` witness returns the selected index as `Uint<8>`. Tally: `tallies[pollId][choice].increment(1)`.

**Ranked Choice Poll** (`PollType.RANKED_CHOICE`) — Borda weighted scoring. `getRankedWeights()` witness returns `Vector<8, Uint<8>>` of weights. Tally: each option accumulates `weights[i]` points. Frontend converts user rankings to Borda points (rank 1 = N points, rank 2 = N-1, ...).

Results page hides tallies while the poll is open — reveals proportional bars (percentage only, no raw counts) after close. Prevents influence on ongoing votes.

### 3. Encrypted Vote History — Supabase + AES-GCM

Vote choices are never on-chain. After a successful ZK vote:
1. Choice is encrypted with `AES-GCM-256` keyed by `HKDF(userSecretKey)` 
2. Encrypted ciphertext stored in Supabase keyed by `(walletAddress, pollId)`
3. Server stores opaque ciphertext — never sees plaintext

My Votes page fetches and decrypts submissions to show "MY CHOICE: Option no" or ranked order. Works across sessions. `userSecretKey` export/import (password-protected AES file) enables cross-device recovery without any server involvement.

### 4. Community Governance Framework

Communities are registered on-chain with `registerCommunity`. Metadata (name, description, poll list) is stored on IPFS via Pinata and cached in the attestation API. Poll creation policy: **Creator Only** (strict — only deployer can create polls) or **Open** (any member). Community feed shows all polls with live countdowns, option pills, and voted status.

### 5. Real-Time On-Chain Tally via Midnight Indexer

Poll results are read directly from the Midnight Indexer GraphQL API (`contractAction → state → ledger.tallies`). The Compact `ledger` function deserializes the on-chain state using the compiled contract's `ledger()` export. Tally reads use `optMap.member(BigInt(idx))` and `counter.read()` — the Compact runtime's `Map<Uint<8>, Counter>` API.

`waitForNewTx` polls the indexer until a new transaction appears after submission, resolving the real tx hash for the 1AM Explorer link. The 1AM wallet returns `undefined` from `submitTransaction` so hash resolution requires post-submission indexer polling.

### 6. Production Deployment

- **Frontend** — Vercel with COOP/COEP headers required for SharedArrayBuffer (WASM ZK proving)
- **API** — Render free tier, kept warm by UptimeRobot 5-min pings on `/health`
- **Database** — Supabase free tier with Row Level Security, service role key server-side only
- **IPFS** — Pinata with dedicated gateway for metadata reliability
- **Tests** — 36 passing (16 contract + 5 API + 15 frontend smoke)

---

## Architecture

```
Browser (1AM Wallet + WASM ZK Prover)
    │
    ├── ZK Circuit Txs ──→ Midnight Network Preprod
    │                       ├── registerCommunity()
    │                       ├── createPoll()
    │                       ├── castBinaryVote()   ← vote choice private
    │                       └── castRankedVote()   ← weights private
    │
    └── Metadata + Storage ──→ Attestation API (Render)
                                ├── Pinata IPFS (community/poll metadata)
                                └── Supabase (encrypted vote history)
```

---

## Future Waves

### Identity & Eligibility Connectors
Gate communities and polls by verified identity:
- **X / Twitter** — follow a specific account (server-side check via twitterapi.io)
- **Discord** — server membership or role requirement (Discord bot token)
- **GitHub** — account activity, org membership, repo commits
- **Telegram** — group/channel membership (bot token)
- **EVM token balance** — ERC-20 minimum balance across Ethereum, Base, Arbitrum, Optimism, Polygon (viem public RPC, no API key)
- **NFT ownership** — ERC-721/1155 specific collection or token ID

All infrastructure is built (`evmChecker.ts`, OAuth routes, `ConnectorSelector` UI) — frozen in v1 pending Midnight Compact compiler support for conditional ZK circuit paths (see below).

### On-Chain Schnorr Attestation (Restore)
In v1, credential enforcement is off-chain only (attestation API checks then allows voting). The original design used Schnorr signatures verified inside the ZK circuit:

```
Server: signCredential(credType, pollIdHash, userPkHash) → SchnorrSignature
Circuit: Schnorr_schnorrVerify(msg, sig, attestationPk)
```

This was removed because the Compact compiler inlines all operations unconditionally into the ZK circuit — `ec_mul(attestationPk, response)` runs even for FREE polls, causing `Point should be part of the subgroup` panics with uninitialized keys.

When Midnight Compact supports truly conditional ZK paths (credType-guarded Schnorr), the full on-chain credential model will be restored — vote choice private AND eligibility cryptographically enforced.

### Multi-Question Surveys
Survey-style voting where each question is a separate poll slot. Frontend built (`CreateSurveyWizard`, `SurveyDetail`), contract support via `castRankedVote` encoding answers as weight slots.

### DAO Treasury Integration
Community treasury managed via Midnight ZK — spending proposals voted on-chain with private ballot, execution triggered by threshold.

### Hierarchical Ranked Choice (MDCT)
Full parent/child option trees with layer-by-layer Borda scoring. Frontend breadcrumb navigation built. Contract uses `PollType.HIERARCHICAL` (same `castRankedVote` circuit). Cascade score computation from layered weights pending.

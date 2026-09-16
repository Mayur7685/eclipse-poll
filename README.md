# Eclipse Poll — Privacy-First ZK Governance on Midnight Network

Eclipse Poll is a privacy-preserving governance dApp built on **Midnight Network** using **Compact** zero-knowledge smart contracts. Individual votes are never revealed — only aggregate tallies are published on-chain.

> Built for Midnight Hackathon · Preprod ZK Contract · 1AM Wallet

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | [your-app.vercel.app](https://your-app.vercel.app) *(update after Vercel deploy)* |
| Attestation API | [your-api.onrender.com](https://your-api.onrender.com) *(update after Render deploy)* |
| Contract (Preprod) | [`06fc9596...607b1ba2f`](https://explorer.1am.xyz/contract/06fc9596f1c12928bd7904f927b995bf727713fa292679b300900ae607b1ba2f?network=preprod) |

---

## Features (v1 — Current)

- **ZK-private voting** via `castBinaryVote` and `castRankedVote` Compact circuits
- **Single choice and ranked choice polls** — Borda weighted scoring for ranked
- **Real-time on-chain tally** read from Midnight Indexer — results hidden while poll is open
- **Community creation** — any address can create a community and host polls
- **Encrypted vote history** — AES-GCM encrypted submissions stored in Supabase
- **Encryption key export/import** — recover vote history across devices or after browser clear
- **ZK proof generation in-browser** via WASM (no server-side proving)
- **1AM Wallet integration** — the only Midnight Network browser wallet
- **IPFS metadata** — community/poll details pinned via Pinata

---

## Roadmap — Coming Soon

### Identity & Eligibility Connectors
When Midnight Compact compiler supports conditional ZK circuit paths, full on-chain credential gating will be restored:

- **X / Twitter** — follow a specific account to unlock voting
- **Discord** — server membership or role requirement
- **GitHub** — account activity, org membership, repo contributions
- **Telegram** — group/channel membership

### On-Chain Token & NFT Gating
Using EVM wallet connection for cross-chain verification:

- ERC-20 token balance threshold
- ERC-721 / ERC-1155 NFT ownership
- Multi-chain: Ethereum, Base, Arbitrum, Optimism, Polygon

### Other Features
- Schnorr attestation on-chain (restore when compiler supports conditional ZK paths)
- Survey-style multi-question polls
- DAO treasury integration
- Hierarchical ranked choice (MDCT voting)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (1AM Wallet + WASM ZK Prover)          │
│  React + Vite + TypeScript                      │
└───────────────┬────────────────────────────────┘
                │ ZK Circuit Txs (callTx)
                ▼
┌─────────────────────────────────────────────────┐
│  Midnight Network Preprod                       │
│  Compact Smart Contract                         │
│  ├── registerCommunity()                        │
│  ├── createPoll()                               │
│  ├── castBinaryVote()   ← ZK private            │
│  ├── castRankedVote()   ← ZK private            │
│  └── closePoll()                                │
└─────────────────────────────────────────────────┘
                
┌─────────────────────────────────────────────────┐
│  Attestation API (Express.js on Render)         │
│  ├── Community/Poll metadata (Pinata IPFS)      │
│  └── Encrypted vote storage (Supabase)         │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| ZK Contract | Midnight Network Compact v0.23 |
| Contract Runtime | @midnight-ntwrk/compact-runtime 0.16.0 |
| Ledger | @midnight-ntwrk/ledger-v8 8.0.3 |
| Frontend | React 18 + Vite + TypeScript |
| Wallet | 1AM Wallet (window.midnight['1am']) |
| API | Express.js + TypeScript |
| Database | Supabase (PostgreSQL, encrypted) |
| IPFS | Pinata |
| Deployment | Vercel (frontend) + Render (API) |

---

## Quick Start

### Prerequisites
- Node.js 22+
- Compact compiler `npx compact compile +0.31.0`
- 1AM Wallet browser extension (Chrome/Brave)
- Supabase account (free tier)
- Pinata account (free tier)

### Setup

```bash
git clone https://github.com/your-org/eclipse-poll
cd eclipse-poll
npm install

# Copy env files and fill in values
cp attestation-api/.env.example attestation-api/.env
cp frontend/.env.example frontend/.env

# Build everything (contract + API + frontend)
npm run build
```

### Run locally

```bash
# Terminal 1 — Attestation API (port 4000)
npm run dev --workspace=attestation-api

# Terminal 2 — Frontend (port 5173)
npm run dev --workspace=frontend
```

Open `http://localhost:5173/admin/setup` → Connect 1AM Wallet → Deploy Contract

### Environment Variables

**`attestation-api/.env`** (minimum required):

| Variable | Description |
|---|---|
| `ATTESTATION_SECRET_KEY` | 32-byte hex signing key |
| `PINATA_JWT` | Pinata API JWT for IPFS uploads |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) |

**`frontend/.env`** (minimum required):

| Variable | Description |
|---|---|
| `VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS` | Deployed contract address |
| `VITE_VERIFIER_URL` | Attestation API URL |
| `VITE_PINATA_GATEWAY` | Pinata IPFS gateway |

See `.env.example` files for full documentation.

---

## Supabase Setup

Run in Supabase SQL Editor:

```sql
CREATE TABLE submissions (
  address    TEXT    NOT NULL,
  poll_id    TEXT    NOT NULL,
  ciphertext TEXT    NOT NULL,
  saved_at   BIGINT  NOT NULL,
  PRIMARY KEY (address, poll_id)
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_public" ON submissions
  AS RESTRICTIVE TO public
  USING (false) WITH CHECK (false);
```

---

## Testing

```bash
# Contract compile verification (16 tests)
npm test --workspace=contract

# Attestation API unit tests (5 tests)
npm test --workspace=attestation-api

# Frontend smoke tests (15 tests)
npm test --workspace=frontend
```

---

## Deployment

### Frontend → Vercel
1. Import GitHub repo on [vercel.com](https://vercel.com)
2. Set env vars from `frontend/.env.example`
3. Deploy — Vercel uses `vercel.json` automatically

### API → Render
1. Connect GitHub repo on [render.com](https://render.com)
2. Set env vars from `attestation-api/.env.example`
3. Set `APP_URL` to your Render service URL after first deploy

### Contract → Midnight Preprod
1. Deploy once via `http://your-app/admin/setup`
2. Copy contract address to `VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS`
3. Redeploy frontend with new address

---

## Privacy Model

| Data | Visibility | How |
|---|---|---|
| Vote choice | Private forever | ZK witness — never leaves browser |
| Who voted | Unlinkable | Nullifier hash — no identity link |
| Aggregate tally | Public after close | On-chain counter increment |
| Vote history | Encrypted | AES-GCM with user-held key |

The contract uses **zero-knowledge proofs** to verify:
- The voter knows a valid nullifier (anti-double-vote)
- The vote choice increments the correct tally counter

Without revealing which option was chosen, who the voter is, or any linkage between votes.

---

## License

MIT

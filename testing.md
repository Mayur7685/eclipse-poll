# Eclipse Poll — Testing Guide

Step-by-step guide for running, testing, and verifying Eclipse Poll locally.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 22+ | `node -v` |
| Compact compiler | 0.31.0 | `npx compact compile +0.31.0 --version` |
| 1AM Wallet | Latest | Chrome/Brave extension |
| Supabase account | Free | [supabase.com](https://supabase.com) |
| Pinata account | Free | [pinata.cloud](https://pinata.cloud) |

---

## Initial Setup

```bash
# 1. Install all dependencies
npm install

# 2. Copy and fill env files
cp attestation-api/.env.example attestation-api/.env
cp frontend/.env.example frontend/.env
# Edit both files with your values

# 3. Build all workspaces
npm run build
```

The build runs in sequence:
- `build:contract` — compiles `eclipse_poll.compact`, generates ZK prover keys
- `sync:zk` — copies ZK assets to `frontend/public/zk/eclipse-poll/`
- `build:api` — compiles attestation API TypeScript
- `build:frontend` — bundles React app with Vite

---

## Running Local Servers

Open two terminals:

```bash
# Terminal 1 — Attestation API (http://localhost:4000)
npm run dev --workspace=attestation-api

# Terminal 2 — Frontend (http://localhost:5173)
npm run dev --workspace=frontend
```

---

## End-to-End Testing

### Step 1 — Deploy the Contract

1. Open `http://localhost:5173/admin/setup` in Chrome with 1AM Wallet
2. Click **Connect 1AM Wallet** — approve in the extension
3. Click **Deploy Master Contract**
4. Sign the transaction in 1AM Wallet (takes 30–120s for ZK proof)
5. Copy the deployed contract address from the success screen
6. Add to `frontend/.env`:
   ```
   VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS=<address>
   ```
7. Restart the frontend dev server

### Step 2 — Create a Community

1. Go to `http://localhost:5173/communities`
2. Click **+ Create Community** (or **New Community** on landing page)
3. Fill in name and description
4. Click **Next** then **Deploy Community**
5. Sign in 1AM Wallet — wait for confirmation (~30s)

### Step 3 — Create a Simple Poll

1. Inside the community, click **+ Poll**
2. Select poll type: **Simple Poll** (single choice)
3. Fill in title and add 2–8 options
4. Set duration (days)
5. Click **Continue** → **Deploy Poll**
6. Sign in 1AM Wallet

### Step 4 — Vote on the Poll

1. Go to the poll page
2. Click an option to select it
3. Click **Submit Vote**
4. 1AM Wallet prompts for signature — approve
5. ZK proof generates in browser (~10–20s)
6. Vote confirmed — "Already Voted ✓" shown

### Step 5 — Check My Votes

1. Go to **My Votes** in navigation
2. Your vote should appear with:
   - Community name + poll title
   - **MY CHOICE**: the option you selected
   - Timestamp

If "choice details unavailable" appears: the encryption key changed. Vote again.

### Step 6 — View Results

Results are **hidden while the poll is open** (prevents voter influence).

To see results:
1. Wait for the poll to expire (or create a short-duration poll)
2. Once closed: go to **View Results** → bars show percentage breakdown
3. No raw vote counts shown — only proportional results

### Step 7 — Create a Ranked Poll

1. Create a new poll, select **Ranked Choice** type
2. Add 3–8 options
3. On the poll page, tap options to assign ranks (1 = top choice)
4. Submit Vote → sign in wallet
5. In My Votes: shows **MY RANKING** with ordered options

### Step 8 — Test Key Export/Import

1. Go to **My Votes** → **Export** button
2. Enter a password → download `eclipse-poll-key.json`
3. Clear localStorage in browser DevTools → Application → Local Storage → Clear All
4. Reload My Votes — shows "Vote recorded — choice details unavailable"
5. Click **Import** → select the key file → enter password
6. Choice labels reappear

---

## API Health Checks

```bash
# API status
curl http://localhost:4000/health

# List communities
curl http://localhost:4000/communities

# Check submissions for an address
curl http://localhost:4000/submissions/<wallet-address>
```

---

## Contract Verification

```bash
# Check compiled circuit keys exist (should show 5 prover files)
ls contract/src/managed/eclipse_poll/keys/*.prover

# Check ZK assets synced to frontend
ls frontend/public/zk/eclipse-poll/keys/

# Verify contract enum values in compiled output
grep "PollType\|SIMPLE\|RANKED" contract/dist/managed/eclipse_poll/contract/index.d.ts
```

---

## Automated Tests

```bash
# Contract tests — verifies compilation and circuit keys (16 tests)
npm test --workspace=contract

# API tests — health, submissions endpoints (5 tests)
npm test --workspace=attestation-api

# Frontend smoke tests — build artifacts, ZK keys, no stale deps (15 tests)
npm test --workspace=frontend
```

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| "Wallet not detected" | 1AM extension not installed | Install from Chrome Web Store |
| Vote fails with "Proof server check failed" | Contract mismatch | Redeploy contract via /admin/setup |
| "Poll not found" | Old poll on different contract | Create new poll after redeploying |
| My Votes empty | localStorage cleared | Import key file or re-vote |
| "Unknown Community" | communities.json reset | Create new community |
| API 500 errors | PINATA_JWT not set | Check attestation-api/.env |
| Supabase connection error | SUPABASE_* vars not set | Check attestation-api/.env |

---

## What is NOT Available in v1

The following features are visible in the UI but marked **Coming Soon**:

- **Credential gating** — community/poll access control via X, Discord, GitHub, NFT ownership
- **OAuth connectors** — social account verification requires OAuth app registration
- **Token/NFT balance checks** — EVM on-chain verification (code complete but UI frozen)

All polls and communities are open to any 1AM Wallet holder in v1.

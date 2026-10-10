# Eclipse Poll

Privacy-first governance dApp built on [Midnight Network](https://midnight.network).
Votes are ZK proofs — the network knows *a vote happened*, not *who voted* or *what they chose*.

**Live:** https://eclipse-poll.vercel.app  
**API:** https://eclipse-poll-api-h0a8.onrender.com  
**Contract (preprod):** `321c2d72d2621b5f0d38cb244d89e6918d7ecdc7b6846be4e414f6652a70bb82`  
**Explorer:** https://explorer.1am.xyz/contract/321c2d72d2621b5f0d38cb244d89e6918d7ecdc7b6846be4e414f6652a70bb82?network=preprod

---

## Poll Types

| Type | Circuit | Description |
|------|---------|-------------|
| Single Choice | `castBinaryVote` | Pick one — ZK hides the choice |
| Ranked Choice | `castRankedVote` | Borda count ranking |
| Approval | `castApprovalVote` | Select all you approve of |
| Hierarchical | `castHierarchicalVote` | Multi-layer MDCT voting |

Credentialed variants (`castCredentialedBinaryVote`, `castCredentialedRankedVote`) verify a Schnorr attestation inside the ZK circuit. Free polls have **zero** ec_mul ops — no overhead.

---

## Credential Gating

| Type | Mechanism |
|------|-----------|
| Free | Anyone in the community can vote |
| Allowlist | Schnorr attestation from the attestation provider |
| Social OAuth | GitHub / Discord / Twitter verification via API |

Users claim credentials once via `claimCommunityCredential` — a nullifier is stored on-chain, no identity revealed. The credential persists; no re-verification per poll.

---

## Contract (11 circuits)

```
Ledger:
  communities              Map<Bytes<32>, CommunityOnChainConfig>
  polls                    Map<PollId, PollConfig>
  nullifiers               Set<Nullifier>
  tallies                  Map<PollId, Map<Uint<8>, Counter>>
  hierarchicalTallies      Map<PollId, Map<Uint<8>, Map<Uint<8>, Counter>>>
  communityCredentials     Map<Bytes<32>, Map<Nullifier, Counter>>
  attestationPk            JubjubPoint

Circuits:
  registerCommunity
  createPoll
  castBinaryVote
  castRankedVote
  castApprovalVote
  castHierarchicalVote
  castCredentialedBinaryVote
  castCredentialedRankedVote
  claimCommunityCredential
  registerAttestationProvider
  closePoll
```

---

## Stack

- **Contract:** Compact (Midnight ZK) — compiled to WASM prover keys
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Wallet:** 1AM Wallet — ZK proofs generated in-browser
- **API:** Express + TypeScript — Schnorr signing, OAuth, IPFS, Supabase
- **DB:** Supabase (AES-GCM encrypted vote history) + JSON (community metadata)

---

## Local Development

```bash
git clone https://github.com/Mayur7685/eclipse-poll
cd eclipse-poll && npm install
```

**`attestation-api/.env`:**
```env
ATTESTATION_SECRET_KEY=0x271a4d674b01f6516f0155bbb235693fcbe9d4a45ebeaffe976be1e45b55f66c
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PINATA_JWT=eyJ...
APP_URL=http://localhost:5173
PORT=4000
```

**`frontend/.env`:**
```env
VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS=321c2d72d2621b5f0d38cb244d89e6918d7ecdc7b6846be4e414f6652a70bb82
VITE_MIDNIGHT_INDEXER_WS_URL=wss://indexer.testnet.midnight.network/api/v1/graphql
VITE_MIDNIGHT_NODE_URL=https://rpc.testnet.midnight.network
VITE_VERIFIER_URL=http://localhost:4000
```

```bash
# Terminal 1
cd attestation-api && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Admin Setup (first deployment)

1. `/admin/setup` → **Deploy Master Contract**
2. **Register Attestation Provider** — stores Jubjub public key on-chain
3. Update `VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS` in `frontend/.env` and `frontend/.env.production`

---

## Supabase

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
  AS RESTRICTIVE TO public USING (false) WITH CHECK (false);
```

---

## Tests

```bash
cd contract         && npm test   # 16 compile tests
cd attestation-api  && npm test   # 5 API tests
cd frontend         && npm test   # 15 smoke + unit tests
```

36 tests total across 3 packages.

---

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | `vercel.json` |
| API | Render | `render.yaml` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

`contract/dist/` is committed — Vercel serves prover keys without running the compiler.

---

## Privacy Model

- Vote choice is a ZK witness — never disclosed on-chain
- Nullifiers prevent double-voting: `hash(userSecretKey, pollId)`
- Community credentials store a nullifier — proves membership without revealing identity
- Schnorr signatures are verified inside the ZK circuit — stay private
- Vote history in Supabase is AES-GCM encrypted — only the key holder can read it

---

## License

MIT

# Eclipse Poll — Project Context

> **Last analyzed:** 2026-09-28
> **Status:** Live on Midnight Preprod · eclipse-poll.vercel.app

---

## 1. What This Is

Eclipse Poll is a **privacy-first governance dApp** on **Midnight Network**. Individual votes are never revealed — only aggregate tallies are published on-chain. Built for the Midnight Hackathon, now in post-hackathon growth phase.

**Live URLs:**
| Layer | URL |
|---|---|
| Frontend | `eclipse-poll.vercel.app` |
| Attestation API | `eclipse-poll-api-h0a8.onrender.com` |
| Contract | `0x06fc9596f1c12928bd7904f927b995bf727713fa292679b300900ae607b1ba2f` |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| ZK Contract | Midnight Compact v0.23 (language 0.22–0.23) |
| Contract Runtime | `@midnight-ntwrk/compact-runtime` 0.16.0 |
| Ledger | `@midnight-ntwrk/ledger-v8` 8.0.3 |
| Midnight.js | v4.0.4 |
| Wallet SDK | `@midnight-ntwrk/wallet-sdk-*` v3.x |
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Routing | react-router-dom v6 |
| Styling | Tailwind CSS 3 + PostCSS |
| State | Zustand v4 (communities) + React Context (wallet) |
| API | Express.js 4 + TypeScript |
| DB | Supabase (PostgreSQL) with in-memory fallback |
| IPFS | Pinata (server-side proxy) |
| EVM Checks | viem v2 |
| HTTP | axios |
| Deploy | Vercel (frontend) + Render (API) + Railway (alt) |
| Testing | node:test (built-in) |
| Monorepo | npm workspaces (3 packages) |

---

## 3. Architecture at a Glance

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (React SPA, Vercel)                       │
│  Pages: PollFeed, PollDetail, Results, Community*,  │
│          Surveys, Activity, Credentials, Admin      │
│  Libs: eclipse.ts, midnight.ts, evmWallet.ts,       │
│         submissionCrypto.ts, decay.ts, attestation.ts│
│  State: WalletContext + Zustand communityStore       │
└──────────────┬──────────────────────┬───────────────┘
               │ ZK proof + tx        │ HTTP
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────┐
│  MIDNIGHT NETWORK    │  │  ATTESTATION API (Render)│
│  Compact Contract    │  │  Express.js server       │
│  5 circuits          │  │  OAuth (GH/Discord/Tw)   │
│  Ledger: communities │  │  Requirement checks      │
│  polls, nullifiers   │  │  Supabase + IPFS pinning │
│  tallies             │  │  Encrypted submissions   │
└──────────────────────┘  └──────────┬───────────────┘
                                     │
                              ┌──────┴──────┐
                              │  Supabase   │
                              │  Pinata     │
                              │  EVM RPC    │
                              └─────────────┘
```

---

## 4. Smart Contract Details

**File:** `contract/src/eclipse_poll.compact`

### Circuits (5)

| Circuit | Purpose | Private Witness |
|---|---|---|
| `registerCommunity` | On-chain community anchoring | — |
| `createPoll` | Poll registration w/ pre-initialized tallies | — |
| `castBinaryVote` | Single-choice vote | `getVoteChoice()` |
| `castRankedVote` | Ranked-choice vote | `getRankedWeights()` (8×Uint8) |
| `closePoll` | Close poll (creator only) | — |

### Enums

| Enum | Values |
|---|---|
| `PollType` | `SIMPLE(0)`, `RANKED_CHOICE(1)`, `HIERARCHICAL(2)` |
| `CredentialType` | `FREE(0)`, `ALLOWLIST(1)`, `SOCIAL_OAUTH(2)` |

### Ledger State

| Field | Type | Purpose |
|---|---|---|
| `contractAdmin` | PublicKey | Admin key |
| `communities` | Map<CommunityId, CommunityConfig> | Community registry |
| `polls` | Map<PollId, PollConfig> | Poll registry |
| `pollCount` | Counter | Poll counter |
| `nullifiers` | Set<Bytes32> | Anti-double-vote |
| `tallies` | Map<PollId, Map<Uint8, Counter>> | Aggregate vote counts |

### Private Witnesses

| Witness | Type | Use |
|---|---|---|
| `getUserSecret()` | Bytes32 | User secret key |
| `getVoteChoice()` | Uint8 | Selected option |
| `getRankedWeights()` | Vector<Uint8, 8> | Borda weights |

### Schnorr Module (`schnorr.compact`)
- `schnorrVerify(msg, signature, pk)` — In-circuit verification
- `schnorrChallenge(...)` — Pure helper for challenge computation

### Compiled Output
- `contract/dist/` — JS + type declarations (committed)
- `contract/src/managed/` — Compiler artifacts (gitignored)

---

## 5. Frontend Architecture

### Routes

| Route | Page | Status |
|---|---|---|
| `/` | HomeGate → redirect | ✅ |
| `/oauth/:provider/callback` | OAuthCallback | ✅ |
| `/polls` | PollFeed | ✅ |
| `/surveys` | Surveys | ✅ |
| `/activity` | Activity | ✅ |
| `/communities` | CommunityFeed | ✅ |
| `/communities/:id` | CommunityDetail | ✅ |
| `/communities/:id/posts` | CommunityPosts | ✅ |
| `/communities/:id/posts/:postId` | PostDetail | ✅ |
| `/communities/:communityId/polls/:pollId` | PollDetail | ✅ |
| `/communities/:communityId/surveys/:pollId` | SurveyDetail | ✅ |
| `/communities/:communityId/polls/:pollId/results` | PollResults | ✅ |
| `/create` | CreateCommunity | ✅ |
| `/create-poll` | CreatePoll | ✅ |
| `/create-survey` | CreateSurvey | ✅ |
| `/credentials` | CredentialsHub | ✅ |
| `/my-credentials` | MyCredentials | ✅ |
| `/my-votes` | MyVotes | ✅ |
| `/admin/setup` | AdminSetup | ✅ |
| `/forms/*` | Form pages | 🚧 Stub |

### Key Hooks

| Hook | File | Purpose |
|---|---|---|
| `useVoting` | `hooks/useVoting.ts` | Cast ZK votes (binary, ranked, survey) |
| `useVoteHistory` | `hooks/useVoteHistory.ts` | Read encrypted submissions |
| `useCredentialHub` | `hooks/useCredentialHub.ts` | Attestation status + decay |
| `useConnectedAccounts` | `hooks/useConnectedAccounts.ts` | OAuth account management |
| `useEvmWallet` | `hooks/useEvmWallet.ts` | EVM wallet for credential checks |
| `usePosts` | `hooks/usePosts.ts` | 🚧 Stub |
| `useQuests` | `hooks/useQuests.ts` | 🚧 Stub |

### Core Libraries (`src/lib/`)

| File | Purpose |
|---|---|
| `eclipse.ts` | Contract interaction layer (callCircuitOnMasterContract) |
| `midnight.ts` | Midnight.js provider setup |
| `evmWallet.ts` | EVM wallet connector |
| `submissionCrypto.ts` | AES-GCM vote encryption |
| `decay.ts` | Voting power decay model |
| `pinata.ts` | IPFS read/upload client |
| `attestation.ts` | Schnorr attestation client |
| `ranking.ts` | MDCT ranked-choice scoring |
| `verifier.ts` | Verifier API HTTP client |
| `utils.ts` | Utility helpers |

### Components (28 total)

Layout, PollCard, WalletButton, CreatePollWizard, CreateCommunityWizard, CreateSurveyWizard, VotingMode, OptionLayer, LayerNavbar, VoteConfirmModal, KeyManager, CredentialHub, ZKCredentialPanel, ConnectorSelector, CreatePostModal, QuestCard, ShareButtons, Toast, Skeleton, OnboardingTutorial, RequirementsPanel, VotingPowerGauge, Icons

---

## 6. Attestation API

**File:** `attestation-api/src/server.ts` (727 lines)

### Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/communities` | List communities |
| GET | `/communities/:id` | Get community |
| POST | `/communities/confirm` | Register after on-chain tx |
| POST | `/polls/confirm` | Register poll |
| POST | `/verify/check` | Check requirements |
| POST | `/verify/credential-params` | Issue Schnorr attestation |
| POST | `/pin/community` | Pin community to IPFS |
| POST | `/pin/poll` | Pin poll to IPFS |
| POST | `/pin/image` | Pin image to IPFS |
| POST | `/submissions` | Store encrypted vote |
| GET | `/submissions/:address` | Get encrypted votes |
| GET | `/auth/github` + callback | GitHub OAuth |
| GET | `/auth/discord` + callback | Discord OAuth |
| GET | `/auth/twitter` + callback | Twitter OAuth2 PKCE |
| GET | `/key-backup/:address` | Retrieve key backup |

### Requirement Types

| Type | Status |
|---|---|
| FREE | ✅ Always passes |
| ALLOWLIST | ✅ EVM address check |
| X_FOLLOW | ✅ Twitter API |
| DISCORD_MEMBER | ✅ Guild membership |
| DISCORD_ROLE | ✅ Role check |
| GITHUB_ACCOUNT | ✅ GitHub user |
| TELEGRAM_MEMBER | ✅ Bot API |
| TOKEN_BALANCE | ✅ ERC-20 via viem |
| NFT_OWNERSHIP | ✅ ERC-721/1155 via viem |
| ONCHAIN_ACTIVITY | 🚧 TODO |
| DOMAIN_OWNERSHIP | 🚧 TODO |

---

## 7. Data Flow

### Vote Casting Flow
1. User connects 1AM Wallet → `WalletContext` creates `ConnectedSession`
2. Session provides Midnight.js providers (private state, public data, ZK config, proof, wallet, midnight)
3. `callCircuitOnMasterContract` pipeline:
   - Verify contract indexing on Midnight GraphQL indexer
   - Generate ZK proof in-browser via WASM (~10–20s)
   - Request 1AM Wallet signature
   - Submit transaction
   - Poll indexer for new tx hash
4. Vote choice encrypted with AES-GCM → stored server-side (Supabase)
5. Results read from on-chain ledger via Midnight Indexer

### Privacy Model
- Vote choice = private witness (never leaves browser)
- Nullifier prevents double-voting without identity linkage
- Aggregate tally is public after poll closes

---

## 8. Environment Variables

See `.env.example` for full template. Key vars:

| Var | Used In | Purpose |
|---|---|---|
| `VITE_MIDNIGHT_NETWORK` | Frontend | Network ID |
| `VITE_CONTRACT_ADDRESS` | Frontend | Deployed contract |
| `VITE_API_URL` | Frontend | Attestation API base |
| `SUPABASE_URL` / `SUPABASE_KEY` | API | Database |
| `PINATA_JWT` | API | IPFS pinning |
| `TWITTER_API_KEY` | API | Twitter checks |
| `DISCORD_BOT_TOKEN` | API | Discord checks |
| `TELEGRAM_BOT_TOKEN` | API | Telegram checks |
| `GITHUB_CLIENT_ID/SECRET` | API | GitHub OAuth |
| `DISCORD_CLIENT_ID/SECRET` | API | Discord OAuth |
| `TWITTER_CLIENT_ID/SECRET` | API | Twitter OAuth |

---

## 9. Testing

| Suite | File | Tests | Status |
|---|---|---|---|
| Contract | `contract/test/compile.test.ts` | 16 | ✅ |
| API | `attestation-api/test/server.test.ts` | 5 | ✅ |
| Frontend | `frontend/test/smoke.test.ts` | 15 | ✅ |
| **Total** | | **36** | ✅ |

---

## 10. Known Issues & Technical Debt

| Issue | Location | Severity |
|---|---|---|
| CORS permissive | `server.ts` | Medium — tighten for prod |
| `ONCHAIN_ACTIVITY` not implemented | `server.ts:327` | Medium |
| `DOMAIN_OWNERSHIP` not implemented | `server.ts:327` | Medium |
| Schnorr attestation removed from contract | `eclipse_poll.compact` | High — Compact compiler limitation |
| Hierarchical MDCT = flat ranked in contract | `eclipse_poll.compact` | Medium — UI built, contract pending |
| Forms pages are stubs | `frontend/src/forms/` | Low — disabled |
| `usePosts` hook is stub | `hooks/usePosts.ts` | Low |
| `useQuests` hook is stub | `hooks/useQuests.ts` | Low |
| No CI/CD pipeline | — | Medium |
| No E2E tests | — | Medium |

---

## 11. File Index (Quick Reference)

```
eclipse-poll/
├── CONTEXT.md              ← You are here
├── PLAN.md                 ← Task-wise roadmap
├── PROPOSAL.md             ← Original product proposal
├── README.md               ← Project README
├── testing.md              ← Testing guide
├── wave-update.md          ← Wave update doc
├── .env.example            ← Env template
├── package.json            ← Monorepo root
│
├── contract/
│   ├── src/
│   │   ├── eclipse_poll.compact    ← Main contract
│   │   ├── schnorr.compact         ← Schnorr module
│   │   ├── witnesses.ts            ← Private witnesses
│   │   └── index.ts                ← Exports
│   ├── dist/                       ← Compiled JS
│   └── test/compile.test.ts        ← 16 tests
│
├── attestation-api/
│   ├── src/
│   │   ├── server.ts               ← Express server (727 lines)
│   │   ├── signing.ts              ← Schnorr signing
│   │   ├── evmChecker.ts           ← EVM balance checks
│   │   ├── types.ts                ← API types
│   │   └── oauth.ts                ← OAuth state
│   ├── dist/                       ← Compiled JS
│   └── test/server.test.ts         ← 5 tests
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                ← Entry
│   │   ├── App.tsx                 ← Router
│   │   ├── types.ts                ← Types
│   │   ├── contexts/WalletContext.tsx
│   │   ├── lib/                    ← 10 library files
│   │   ├── hooks/                  ← 9 hooks
│   │   ├── store/communityStore.ts ← Zustand
│   │   ├── pages/                  ← 20 pages
│   │   ├── components/             ← 28 components
│   │   └── forms/                  ← 4 stub pages
│   ├── public/zk/eclipse-poll/keys/ ← 5 prover keys
│   └── test/smoke.test.ts          ← 15 tests
│
└── scripts/
    └── deploy-master.ts            ← Headless deploy
```

---

## 12. Midnight-Specific Gotchas

1. **Compact compiler inlines all operations unconditionally** — cannot have conditional ZK paths (this killed on-chain Schnorr attestation in v1)
2. **Prover keys are large** — 5 key files in `public/zk/eclipse-poll/keys/`, loaded in-browser for WASM proving
3. **Indexer polling required** — after tx submission, must poll Midnight GraphQL indexer for confirmation
4. **1AM Wallet required** — no alternative wallet support currently
5. **Proof generation is slow** — ~10–20s in-browser, needs good UX loading states
6. **Contract must be indexed** — `callCircuitOnMasterContract` verifies indexing before proceeding

# Eclipse Poll — Feature & Improvement Plan

> **Created:** 2026-09-28
> **Priorities:** P0 = Critical · P1 = High · P2 = Medium · P3 = Low

---

## Phase 0: Foundation & Stability (P0)

*Get the existing system rock-solid before adding features.*

| # | Task | Description | Est. |
|---|---|---|---|
| 0.1 | **Tighten CORS** | Replace permissive CORS in `server.ts` with origin whitelist | 1h |
| 0.2 | **Add CI/CD pipeline** | GitHub Actions: lint → test → build on PR; auto-deploy on merge | 4h |
| 0.3 | **Add E2E tests** | Playwright: connect wallet → create poll → vote → view results | 8h |
| 0.4 | **Error boundary + fallback UI** | React error boundary, graceful degradation when indexer/API down | 3h |
| 0.5 | **Rate limiting on API** | `express-rate-limit` on all POST endpoints | 2h |
| 0.6 | **Input validation** | `zod` schemas on all API endpoints (communities, polls, submissions) | 4h |
| 0.7 | **Structured logging** | Replace `console.log` with `pino` or `winston`, add request IDs | 3h |

---

## Phase 1: Complete Stub Features (P1)

*Finish what was started but left as stubs.*

| # | Task | Description | Est. |
|---|---|---|---|
| 1.1 | **Implement `usePosts` hook** | CRUD for community posts via API + IPFS metadata | 6h |
| 1.2 | **Implement `useQuests` hook** | Quest system: create quests, track completion, reward credentials | 8h |
| 1.3 | **Build Forms pages** | FormBuilder, FormRespond, FormsDashboard, FormResults — rebuild for Midnight | 12h |
| 1.4 | **Implement `ONCHAIN_ACTIVITY` check** | Check EVM address for recent tx activity via viem | 3h |
| 1.5 | **Implement `DOMAIN_OWNERSHIP` check** | ENS/UNS domain ownership verification | 3h |

---

## Phase 2: Smart Contract Upgrades (P1)

*Enhance the Compact contract with new capabilities.*

| # | Task | Description | Est. |
|---|---|---|---|
| 2.1 | **Restore Schnorr attestation on-chain** | Separate credentialed circuits: `castCredentialedBinaryVote`, `castCredentialedRankedVote` — avoids conditional ZK path issue | 16h |
| 2.2 | **Hierarchical MDCT voting** | True parent/child option trees with cascade scoring in contract | 20h |
| 2.3 | **Private mid-poll snapshots** | Encrypted tally snapshots for poll creators (only decryptable after close) | 10h |
| 2.4 | **Poll metadata on-chain** | Store poll title/description hash on-chain (not just IPFS) | 4h |
| 2.5 | **Poll cancellation circuit** | `cancelPoll(pollId)` — creator can cancel, nullifiers cleared | 6h |
| 2.6 | **Vote delegation** | `delegateVote(pollId, delegatee)` — proxy voting with ZK proof | 12h |

---

## Phase 3: New Feature — DAO Treasury (P2)

*Community treasuries managed via Midnight ZK.*

| # | Task | Description | Est. |
|---|---|---|---|
| 3.1 | **Treasury contract module** | `treasury.compact` — deposit, propose, vote on proposals, execute | 24h |
| 3.2 | **Treasury frontend pages** | TreasuryDashboard, ProposalDetail, CreateProposal | 12h |
| 3.3 | **Treasury API endpoints** | Proposals CRUD, execution tracking | 6h |
| 3.4 | **ZK-proven treasury votes** | Reuse voting circuits for proposal voting | 8h |

---

## Phase 4: New Feature — Multi-Community Identity (P2)

*Single attestation covering multiple communities.*

| # | Task | Description | Est. |
|---|---|---|---|
| 4.1 | **Identity aggregation contract** | `identity.compact` — aggregate credentials across communities | 16h |
| 4.2 | **Cross-community reputation** | Reputation score computed from participation across communities | 10h |
| 4.3 | **Unified identity page** | Frontend: show all credentials, reputation, participation history | 8h |

---

## Phase 5: New Feature — Advanced Poll Types (P2)

*Beyond binary and ranked choice.*

| # | Task | Description | Est. |
|---|---|---|---|
| 5.1 | **Quadratic voting** | `castQuadraticVote(pollId, option, voiceCredits)` — cost = credits² | 12h |
| 5.2 | **Weighted voting** | Token-weighted or NFT-weighted voting power | 10h |
| 5.3 | **Approval voting** | Select all that apply — multiple options per voter | 6h |
| 5.4 | **Score voting (1–5)** | Rate each option on a scale | 6h |
| 5.5 | **Condorcet voting** | Pairwise comparison matrix, Condorcet winner | 16h |

---

## Phase 6: UX & Polish (P2)

*Make the app feel production-ready.*

| # | Task | Description | Est. |
|---|---|---|---|
| 6.1 | **Mobile-responsive audit** | Test all pages on mobile, fix layout issues | 6h |
| 6.2 | **Dark/light mode** | Theme toggle with Tailwind `dark:` classes | 4h |
| 6.3 | **i18n (internationalization)** | `react-i18next`, start with EN + ES | 8h |
| 6.4 | **Accessibility (a11y)** | ARIA labels, keyboard nav, screen reader support, WCAG AA | 8h |
| 6.5 | **Performance optimization** | Code splitting, lazy loading, bundle analysis | 6h |
| 6.6 | **Real-time updates** | WebSocket or SSE for live poll results | 8h |
| 6.7 | **Advanced analytics** | Voter turnout, participation rates, demographic insights (privacy-preserving) | 10h |

---

## Phase 7: Ecosystem & Growth (P3)

*Grow the platform.*

| # | Task | Description | Est. |
|---|---|---|---|
| 7.1 | **Multi-chain EVM support** | Extend credential checks to Base, Arbitrum, Optimism, Polygon | 8h |
| 7.2 | **Telegram Mini App** | Wrap frontend as Telegram Mini App | 12h |
| 7.3 | **Discord bot** | Poll notifications, result announcements in Discord | 8h |
| 7.4 | **SDK for developers** | `@eclipse-poll/sdk` — programmatic poll creation and voting | 16h |
| 7.5 | **Plugin system** | Allow third-party credential types via plugin API | 12h |
| 7.6 | **Mainnet deployment** | Deploy to Midnight mainnet, migrate data | 8h |

---

## Dependency Graph

```
Phase 0 (Foundation)
    │
    ▼
Phase 1 (Complete Stubs) ──────┐
    │                           │
    ▼                           ▼
Phase 2 (Contract Upgrades)    Phase 6 (UX Polish)
    │                           │
    ▼                           │
Phase 3 (DAO Treasury)         │
    │                           │
    ▼                           │
Phase 4 (Multi-Community ID)   │
    │                           │
    ▼                           │
Phase 5 (Advanced Poll Types)  │
    │                           │
    ▼                           ▼
Phase 7 (Ecosystem) ◄──────────┘
```

---

## Recommended Sprint Order

### Sprint 1 (Week 1–2): Foundation
- 0.1 CORS → 0.5 Rate limiting → 0.6 Input validation → 0.7 Logging → 0.2 CI/CD

### Sprint 2 (Week 3–4): Complete Stubs
- 1.4 ONCHAIN_ACTIVITY → 1.5 DOMAIN_OWNERSHIP → 1.1 usePosts → 1.2 useQuests

### Sprint 3 (Week 5–6): Contract Upgrades
- 2.1 Schnorr attestation → 2.4 Poll metadata → 2.5 Cancel poll

### Sprint 4 (Week 7–8): UX Polish
- 6.1 Mobile audit → 6.2 Dark mode → 6.5 Performance → 0.3 E2E tests

### Sprint 5 (Week 9–10): Advanced Features
- 2.2 Hierarchical MDCT → 5.1 Quadratic voting → 5.3 Approval voting

### Sprint 6 (Week 11–12): Ecosystem
- 7.1 Multi-chain → 7.4 SDK → 7.6 Mainnet prep

---

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Compact compiler limitations block features | High | Design circuits to avoid conditional ZK paths; use separate circuits |
| 1AM Wallet UX friction | High | Clear loading states, progress indicators, fallback options |
| Proving time too slow (~10-20s) | Medium | Optimize circuits, show progress, consider server-side proving |
| Supabase/Pinata downtime | Medium | In-memory fallback already in place; add retry logic |
| Midnight network instability | Medium | Retry logic, clear error messages, status page |

---

## Success Metrics

| Metric | Target |
|---|---|
| Test coverage | > 80% |
| E2E test pass rate | 100% |
| API response time (p95) | < 500ms |
| Frontend Lighthouse score | > 90 |
| Vote casting success rate | > 95% |
| Time to cast vote | < 30s (including proving) |

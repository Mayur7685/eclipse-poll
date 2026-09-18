## level 1

- Requirements to Pass
Toolchain installed and a contract that compiles via compact compile,
Passing test suite,
Generated managed/ directory present (circuits + keys),
Contract deployed to Preview or Preprod with a visible contract address,
An initial product idea (1 short paragraph) drafted in the README,
Minimum 5 meaningful commits.

- Submission Checklist
Public GitHub repository with a README.md,
Setup instructions (how to run locally),
Screenshot: successful compile output (circuits listed),
Screenshot: contract deployed with address shown,
README section explaining public state vs private witness,
Initial product idea paragraph,
Minimum 5 meaningful commits.


## level 2

- Requirements to Pass
Lace wallet connect / disconnect implemented,
Circuit called successfully from the frontend,
An observable privacy behavior (something proven without being shown),
Contract deployed to Preprod with a verifiable address,
Minimum 8 meaningful commits.

- Submission Checklist
Public GitHub repository with README,
Live demo link (Vercel, Netlify, or similar),
Deployed Preprod contract address (verifiable on-chain),
Demo video: wallet connect + a successful circuit call,
README documenting the privacy claim,
Minimum 8 meaningful commits.

## level 3

- Requirements to Pass
Fully functional dApp that meaningfully uses Midnight's privacy model,
Minimum 3 tests passing,
CI/CD pipeline running (workflow file + passing runs),
Approved idea submitted from the provided idea list,
Minimum 10 meaningful commits.

- Submission Checklist
Public GitHub repository with complete README,
Live demo link,
Screenshot: test output (3+ tests passing),
CI/CD badge or workflow file with passing runs,
Demo video (1 minute) showing full functionality,
README "privacy model" section: what an observer can and cannot learn,
Product proposal (from the idea list) submitted for approval,
Minimum 10 meaningful commits.


## level 4

### Eclipse Poll — Private Voting with Credential-Gated Governance

**Track:** Governance

**Idea Category:** Private Voting — anonymous ballots with publicly verifiable tallies

---

### What We Built (v1 — Delivered)

Eclipse Poll is a privacy-first governance dApp on Midnight Network. Voters cast zero-knowledge proofs that increment on-chain tally counters without ever revealing their choice. The contract enforces anti-double-vote via unlinkable nullifiers: `nullifier = persistentHash(userSecretKey, pollId)`. The on-chain state reveals only aggregate totals — an observer learns how many votes each option received but cannot link any vote to any address.

**Delivered circuits:**
- `castBinaryVote(pollId)` — single choice, private witness `getVoteChoice()`
- `castRankedVote(pollId)` — Borda weighted scoring, private witness `getRankedWeights()`
- `createPoll(pollId, pollType, credType, optionCount, endTime)` — registers poll with pre-initialized tally counters
- `registerCommunity(communityId, configHash, credType)` — on-chain community anchoring

**Deployed:** `06fc9596f1c12928bd7904f927b995bf727713fa292679b300900ae607b1ba2f` (Midnight Preprod)

---

### What We Will Build (Level 4 — Full Vision)

#### 1. Hierarchical Ranked Choice Voting (MDCT)

Multi-layer governance where options have parent-child relationships. Voters rank within each layer using a breadcrumb-navigated UI. The contract aggregates layer rankings into a cascade score using Modified Descending Comparison Trees — the most expressive ranked-choice mechanism for complex governance decisions (e.g. "Which infrastructure upgrade?" → "Which specific implementation?").

**New circuit:** `castHierarchicalVote(pollId)` with `getRankedWeightsByLayer()` witness that accepts a `Map<parentId, Vector<8, Uint<8>>>` of layered Borda weights. On-chain: `hierarchicalTallies: Map<PollId, Map<ParentId, Map<Uint<8>, Counter>>>`.

#### 2. On-Chain Credential Gating (Schnorr Attestation Restored)

Gate communities and polls by verifiable identity without revealing who is eligible. The attestation server verifies eligibility (X follow, Discord membership, GitHub activity, NFT ownership, ERC-20 balance) and issues a Schnorr signature over `(credType, pollIdHash, userPkHash)`. The ZK circuit verifies the signature inside `castBinaryVote` and `castRankedVote` — the vote is only counted if a valid attestation is included as a private witness.

This was implemented and then removed in v1 due to a Midnight Compact compiler limitation (all circuit operations are inlined unconditionally, causing `ec_mul(attestationPk)` to run even for FREE polls and panic on uninitialized keys). In Level 4, we will implement this correctly using a **separate credentialed vote circuit** that is only called for gated polls, eliminating the conditional path issue entirely.

**New circuits:**
- `castCredentialedBinaryVote(pollId, credType)` — includes `Schnorr_schnorrVerify` with attestation witness
- `castCredentialedRankedVote(pollId, credType)` — same for ranked choice
- `registerAttestationProvider(providerPk: JubjubPoint)` — stores provider public key on-chain

**Privacy property:** The voter proves they hold a valid credential for the poll without revealing their social identity, wallet address, or which specific credential they used. The on-chain state reveals only that a valid credential was used — not whose.

#### 3. Multi-Community Identity Aggregation

A single attestation covers membership across multiple communities. The attestation server aggregates signals: Ethereum token balance + Discord membership + GitHub org membership → single Schnorr signature with encoded `credentialBitmap`. The circuit checks the bitmap against the community's required flags. Users prove multi-dimensional eligibility in a single ZK proof without revealing individual identity signals.

#### 4. Private Mid-Poll Snapshots

Poll creators request a private tally snapshot while the poll is still open. The snapshot is decrypted only for the creator using a per-creator ZK proof — other observers see only that a snapshot was taken, not the intermediate counts. This enables real-time governance dashboards for proposal authors without compromising voter privacy before close.

---

### Why This Matters for Governance

Current on-chain governance (Snapshot, Tally, Governor Bravo) reveals every voter's choice publicly. This creates:
- **Voter coercion** — large holders pressure others after seeing early votes
- **Strategic last-minute voting** — whales wait to see results before voting
- **Identity exposure** — linking governance votes to on-chain wealth

Eclipse Poll solves all three: votes are private until close, nullifiers prevent Sybil attacks without identity revelation, and credential gating ensures only eligible participants vote — all verifiable on Midnight Network without a trusted third party.

# Product Proposal — Eclipse Poll

**Chosen idea (from provided list):** Private Voting — anonymous ballots with publicly verifiable tallies.

Eclipse Poll implements that pattern as **ZK-private governance voting**: the voter's choice is a Compact private witness (the sealed ballot); the public ledger stores only a nullifier hash + tally counters; settlement is continuous — any observer can verify aggregate results without ever learning how any individual voted.

---

## What is the product, and who uses it?

**Eclipse Poll** is a privacy-first governance dApp on Midnight Network. Communities and DAOs create polls and ranked-choice votes whose **individual choices stay private**, then tally against on-chain ZK proofs. Target users: DAOs, protocol governance participants, and any organization that needs verifiable anonymous voting — the same audience that wants sealed ballots rather than public show-of-hands votes on transparent chains.

## Why Midnight specifically?

Transparent L1 governance (Snapshot, Tally, Governor Bravo) exposes every voter's choice on a public explorer — enabling voter coercion, strategic last-minute voting by large holders, and identity exposure linking governance votes to wallet wealth. Midnight's dual ledger + Compact witnesses let us:

1. **Vote privately** (`castBinaryVote`, `castRankedVote`) — choice as a private witness, never on-chain.
2. **Prove uniqueness** without revealing identity — `nullifier = persistentHash(userSecretKey, pollId)` proves you haven't voted before without linking to your address.
3. **Verify tallies publicly** — anyone can read aggregate counts from the public ledger; no one can read individual choices.

A fully transparent chain cannot deliver private ballots without an off-chain trusted operator. Midnight makes anonymous voting cryptographically enforceable on-chain.

## Data Model

| Data Point         | Type             | Disclosed To                                      |
|--------------------|------------------|---------------------------------------------------|
| vote choice        | Private witness  | No one (`getVoteChoice()` never disclosed)        |
| ranked weights     | Private witness  | No one (`getRankedWeights()` never disclosed)     |
| userSecretKey      | Private witness  | No one (stays in browser localStorage)            |
| nullifier          | Public ledger    | Everyone (proves voted, unlinkable to identity)   |
| tally counters     | Public ledger    | Everyone (aggregate only, per option)             |
| pollId             | Public ledger    | Everyone                                          |
| poll config        | Public ledger    | Everyone (type, option count, end time)           |
| community config   | Public ledger    | Everyone (creator hash, credential type)          |

## Mainnet Feasibility

Yes — realistic by Level 6 if Preprod wallet UX stays stable:

| Stage    | Network  | Gate                                                        |
|----------|----------|-------------------------------------------------------------|
| Done     | Preprod  | Contract `06fc9596…b1ba2f` live, voting working             |
| L4–L5    | Preprod  | Credential gating (Schnorr on-chain), hierarchical voting   |
| L6       | Mainnet  | Audits, gas sponsorship, indexer ops, DAO partnerships      |

The `castBinaryVote` and `castRankedVote` circuits already compile and run on Preprod with full ZK proof generation in-browser. Mainnet is an ops + audit climb, not a redesign.

## Scope for approval

We submit **Private Voting** as the Level 3 product proposal. The shipped surface (`eclipse_poll.compact` + React frontend + 1AM Wallet integration + Midnight Preprod deployment) is the concrete implementation of anonymous ballots with publicly verifiable tallies.

**Live demo:** [eclipse-poll.vercel.app](https://eclipse-poll.vercel.app)
**Contract:** `06fc9596f1c12928bd7904f927b995bf727713fa292679b300900ae607b1ba2f` (Midnight Preprod)
**Demo video:** [https://youtu.be/DmC5zzCP9_8](https://youtu.be/DmC5zzCP9_8)

---

## Future Upgrades (Level 4–6)

### 1. Hierarchical Ranked Choice Voting (MDCT)

Multi-layer governance where options have parent-child relationships — voters rank within each layer using a breadcrumb-navigated UI. New circuit `castHierarchicalVote(pollId)` accepts layered Borda weights via `getRankedWeightsByLayer()` witness. Cascade scores computed using Modified Descending Comparison Trees — the most expressive ranked-choice mechanism for complex DAO decisions (e.g. "Which proposal category?" → "Which specific implementation?").

On-chain storage: `hierarchicalTallies: Map<PollId, Map<ParentId, Map<Uint<8>, Counter>>>`. Privacy: individual rankings per layer remain private witnesses; only aggregate cascade scores are public.

### 2. On-Chain Credential Gating (Schnorr Attestation)

Gate communities and polls by verifiable identity without revealing who is eligible. The attestation server verifies off-chain eligibility (X / Twitter follow, Discord server membership, GitHub activity, NFT ownership, ERC-20 token balance) and issues a **Schnorr signature** over `(credType, pollIdHash, userPkHash)`. The ZK voting circuit verifies the signature as a private witness — a vote is only counted if a valid attestation is included.

This was implemented and removed in v1 due to a Midnight Compact compiler limitation: all circuit operations are inlined unconditionally into the ZK circuit, causing `ec_mul(attestationPk)` to execute even for FREE polls, panicking on uninitialized keys. The Level 4 fix uses **separate credentialed circuits** (`castCredentialedBinaryVote`, `castCredentialedRankedVote`) that only exist for gated polls — eliminating the conditional path issue entirely.

Privacy property: the voter proves they hold a valid credential without revealing their social identity, wallet address, or which specific credential was used. The on-chain state reveals only that a valid credential was presented.

### 3. Multi-Community Identity Aggregation

A single ZK attestation covering membership across multiple requirements simultaneously — Ethereum token balance + Discord membership + GitHub org membership → one Schnorr signature encoding a `credentialBitmap`. The circuit checks the bitmap against the community's required flags. Users prove multi-dimensional eligibility in one ZK proof without revealing any individual identity signal.

### 4. Identity Connectors (Social + On-Chain)

Full server-side verification for:
- **X / Twitter** — follow a specific account (via twitterapi.io, no official API key needed)
- **Discord** — server membership or specific role (Discord bot token)
- **GitHub** — account existence, org membership, repo contributions, minimum followers
- **Telegram** — group/channel membership (bot token)
- **ERC-20 token balance** — threshold check across Ethereum, Base, Arbitrum, Optimism, Polygon (via public RPC, no API key)
- **NFT ownership** — ERC-721/1155 collection or specific token ID

All connector infrastructure is already built in the codebase — frozen in v1 pending the credentialed circuit separation above.

### 5. Private Mid-Poll Snapshots

Poll creators request an encrypted tally snapshot while the poll is still open. The snapshot is decrypted only for the creator via a per-creator ZK proof. Other observers see only that a snapshot was taken — not the intermediate counts. This enables real-time governance dashboards for proposal authors without compromising voter privacy before close.

### 6. DAO Treasury Integration

Community treasury managed via Midnight ZK — spending proposals voted on-chain with private ballots, execution triggered by threshold. Budget amounts and individual vote choices stay private; only the pass/fail outcome and execution are public.

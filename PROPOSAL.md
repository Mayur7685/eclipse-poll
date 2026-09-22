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

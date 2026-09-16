// ─── Verifier / Community types ────────────────────────────────────────────────

export type RequirementType =
  | 'FREE'
  | 'ALLOWLIST'
  | 'TOKEN_BALANCE'
  | 'NFT_OWNERSHIP'
  | 'ONCHAIN_ACTIVITY'
  | 'DOMAIN_OWNERSHIP'
  | 'X_FOLLOW'
  | 'DISCORD_MEMBER'
  | 'DISCORD_ROLE'
  | 'GITHUB_ACCOUNT'
  | 'TELEGRAM_MEMBER'

export interface Requirement {
  id: string
  type: RequirementType
  chain?: string
  params: {
    tokenAddress?: string
    minAmount?: string
    contractAddress?: string
    addresses?: string[]
    domain?: string
    handle?: string
    serverId?: string
    roleId?: string
    chatId?: string
    minTxCount?: number
    minRepos?: number
    minFollowers?: number
    orgName?: string
    commitsRepo?: string
    minCommits?: number
    starredRepo?: string
    vote_weight?: number
  }
}

export interface RequirementGroup {
  id: string
  logic: 'AND' | 'OR'
  requirements: Requirement[]
}

export interface PollOptionInfo {
  option_id: number
  label: string
  parent_option_id: number
  child_count: number
}

export interface PollInfo {
  poll_id: string               // bytes32 hex
  community_id?: string         // bytes32 hex — parent community
  title: string
  description?: string
  required_credential_type: number
  created_at_block: number
  end_block?: number            // stored as Unix timestamp seconds (Eclipse uses time, not blocks)
  options: PollOptionInfo[]
  ipfs_cid?: string
  poll_type?: 'flat' | 'hierarchical' | 'survey'
  scope_keys?: Array<{ parentOptionId: number; scopeKey: string }>
  creator_address?: string
}

export interface CommunityConfig {
  community_id: string          // bytes32 hex
  name: string
  description: string
  logo: string
  credential_type: number
  credential_expiry_days: number
  requirement_groups: RequirementGroup[]
  polls?: PollInfo[]
  creator?: string              // Midnight unshielded address
  creator_only?: boolean
  contract_address?: string     // master contract address (if separate per community)
}

// ─── Connected accounts ────────────────────────────────────────────────────────

/** Midnight wallet uses unshielded addresses (mn_addr_preprod1...) */
export type AccountType = 'MIDNIGHT_WALLET' | 'X_TWITTER' | 'DISCORD' | 'GITHUB' | 'TELEGRAM'

export interface ConnectedAccount {
  type: AccountType
  identifier: string
  displayName?: string
}

// ─── Poll types ────────────────────────────────────────────────────────────────

export interface PollOption {
  option_id: number
  label: string
  parent_option_id: number
  child_count: number
}

export interface Poll {
  poll_id: string               // bytes32 hex
  community_id: string          // bytes32 hex
  required_credential_type: number
  created_at: number
  active: boolean
  end_block?: number            // Unix timestamp seconds
  options: PollOption[]
  vote_count?: number
  poll_type?: 'flat' | 'hierarchical' | 'survey'
  title?: string
  description?: string
}

// ─── Vote state ────────────────────────────────────────────────────────────────

export interface VoteRanking {
  [optionId: number]: number    // optionId → rank (1-8, 0 = unranked)
}

// ─── Midnight Attestation (Schnorr-based, not FHE) ────────────────────────────

/**
 * Attestation status for a user in a community.
 * Eclipse Poll uses Schnorr signatures from the attestation API, not on-chain FHE credentials.
 * The ZK circuit verifies the signature in-circuit — nothing is stored on-chain about the user.
 */
export interface AttestationStatus {
  hasAttestation: boolean       // whether user has a valid Schnorr attestation
  credType: number              // 0=FREE, 1=ALLOWLIST, 2=SOCIAL_OAUTH
  communityId: string           // bytes32 hex
  /** Raw Schnorr signature from the attestation API — kept in memory for circuit use */
  signature: {
    announcement: { x: bigint; y: bigint }
    response: bigint
    providerPk: { x: bigint; y: bigint }
  } | null
}

// ─── Vote history ──────────────────────────────────────────────────────────────

export interface VoteCastRecord {
  pollId: string                // bytes32 hex
  communityId: string
  votedAt: number               // Unix timestamp ms
  txHash?: string
}

// ─── Check result ──────────────────────────────────────────────────────────────

export interface CheckResult {
  requirementId: string
  passed: boolean
  error?: string
}

export interface VerifyResponse {
  passed: boolean
  results: CheckResult[]
  txHash?: string
}

/** Response from POST /verify/credential-params — Schnorr attestation issued */
export interface CredentialParamsResponse {
  passed:            boolean
  results:           CheckResult[]
  credentialIssued?: boolean
  txHash?:           string
}

// ─── Tally ────────────────────────────────────────────────────────────────────

export interface TallyResult {
  optionId: number
  count: bigint                 // raw Counter value from Midnight ledger
}

// ─── Hierarchical voting snapshots ────────────────────────────────────────────

export interface ScopedSnapshot {
  snapshot_id:      number
  poll_id:          string
  community_id:     string
  parent_option_id: number
  block_height:     number
  total_votes:      number
  rank_1_option:    number
  rank_2_option:    number
  rank_3_option:    number
  rank_4_option:    number
}

export type ScopedSnapshotMap = Map<number, ScopedSnapshot>

// ─── Posts ────────────────────────────────────────────────────────────────────

export interface PostMetadata {
  post_id: string
  community_id: string
  author: string               // Midnight unshielded address
  title: string
  body: string
  ipfs_cid?: string
  content_hash: string
  created_at_block: number
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export type QuestType = 'VOTE_COUNT' | 'REFERRAL_COUNT' | 'CREDENTIAL_AGE'

export interface QuestInfo {
  quest_id: string
  community_id: string
  title: string
  description: string
  quest_type: QuestType
  target: number
  reward_description: string
  reward_hash: string
  expiry_block: number
  ipfs_cid?: string
  creator_address?: string
}

export interface QuestProgress {
  quest_id: string
  participant: string
  progress: number
  completed: boolean
}

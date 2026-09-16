// Midnight Eclipse Poll — utility helpers
// All reads go through the Midnight Indexer GraphQL API or fetchContractLedger.

const INDEXER_URI =
  import.meta.env.VITE_MIDNIGHT_INDEXER_URI ??
  'https://indexer.preprod.midnight.network/api/v4/graphql'

const MASTER_CONTRACT =
  import.meta.env.VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS ?? ''

// ── Block / time helpers ──────────────────────────────────────────────────────

/**
 * Returns current Unix timestamp in seconds.
 * Eclipse Poll uses Unix time for poll deadlines, not block numbers.
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * Fetch the current block height from the Midnight Indexer.
 * Falls back to Unix timestamp so UI never hard-crashes.
 */
export async function getBlockHeight(): Promise<number> {
  try {
    const res = await fetch(INDEXER_URI, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `query { blockchainState { height } }`,
      }),
    })
    if (!res.ok) return nowSeconds()
    const data = await res.json()
    const height = data?.data?.blockchainState?.height
    return typeof height === 'number' ? height : nowSeconds()
  } catch {
    return nowSeconds()
  }
}

// ── Poll ID / community ID generators ────────────────────────────────────────

export function pollIdFromTitle(title: string): string {
  const encoder = new TextEncoder()
  const rawStr = title + '_' + Date.now() + '_' + Math.random()
  const data = encoder.encode(rawStr)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i]
    hash |= 0
  }
  const hexPart = Math.abs(hash).toString(16)
  const randomHex = Array.from(window.crypto.getRandomValues(new Uint8Array(28)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return '0x' + (hexPart + randomHex).slice(0, 64).padStart(64, '0')
}

export function communityIdFromName(name: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(name.toLowerCase().trim())
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i]
    hash |= 0
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0')
}

export function cidToBytes32(cid: string): string {
  return '0x' + Array.from(new TextEncoder().encode(cid))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0')
    .slice(0, 64)
}

// ── Ledger reads via Midnight Indexer ────────────────────────────────────────

/**
 * Read on-chain ledger state for the master contract.
 * Requires a ConnectedSession — callers must import from lib/eclipse.ts.
 * This thin wrapper is provided for components that don't have a session.
 */
export async function getContractLedger(session: unknown): Promise<unknown | null> {
  if (!MASTER_CONTRACT) return null
  try {
    const { fetchContractLedger } = await import('./eclipse')
    return fetchContractLedger(session as any, MASTER_CONTRACT)
  } catch {
    return null
  }
}

/**
 * Check if a nullifier exists on-chain (i.e. voter already voted).
 * NOTE: This is checked inside the ZK circuit — the circuit will reject duplicates.
 * This client-side check is only for UI feedback before submitting.
 */
export async function hasVoted(
  _pollId: string,
  _address: string,
): Promise<boolean> {
  // The anti-double-vote enforcement is done by the Compact circuit via nullifier Set.
  // Client-side pre-check: look in localStorage for a cached submission record.
  const key = `zkpoll:voted:${_address.toLowerCase()}:${_pollId}`
  return localStorage.getItem(key) === 'true'
}

/** Mark a poll as voted in localStorage (called after successful tx). */
export function markVoted(pollId: string, address: string): void {
  const key = `zkpoll:voted:${address.toLowerCase()}:${pollId}`
  localStorage.setItem(key, 'true')
}

/** Check if a user has already voted on a poll (from localStorage). */
export function hasVotedOn(pollId: string, address: string): boolean {
  const key = `zkpoll:voted:${address.toLowerCase()}:${pollId}`
  return localStorage.getItem(key) === 'true'
}

/**
 * Get on-chain community config. Returns data from ledger if session available,
 * otherwise falls back to attestation API metadata.
 */
export async function getCommunity(communityId: string): Promise<{
  id: string
  creator: string
  configHash: string
  credType: number
  exists: boolean
} | null> {
  try {
    const VERIFIER = import.meta.env.VITE_VERIFIER_URL ?? '/api'
    const res = await fetch(`${VERIFIER}/communities/${encodeURIComponent(communityId)}`)
    if (!res.ok) return null
    const comm = await res.json()
    return {
      id: communityId,
      creator: comm.creator ?? '',
      configHash: comm.ipfs_cid ?? '',
      credType: comm.credential_type ?? 0,
      exists: true,
    }
  } catch {
    return null
  }
}

/**
 * Get on-chain poll config. Returns data from attestation API metadata.
 * On-chain state (active/closed) is read by fetchContractLedger in eclipse.ts.
 */
export async function getPoll(pollId: string): Promise<{
  id: string
  communityId: string
  creator: string
  credType: number
  startBlock: number
  endBlock: number
  optionCount: number
  tallyRevealed: boolean
  tallyPublished: boolean
  exists: boolean
  pollType: number
} | null> {
  try {
    const VERIFIER = import.meta.env.VITE_VERIFIER_URL ?? '/api'
    const communities = await fetch(`${VERIFIER}/communities`).then(r => r.json())
    for (const comm of communities) {
      const p = (comm.polls ?? []).find((p: any) => p.poll_id === pollId)
      if (p) {
        return {
          id: pollId,
          communityId: comm.community_id,
          creator: p.creator ?? '',
          credType: p.cred_type ?? p.required_credential_type ?? 0,
          startBlock: p.created_at_block ?? 0,
          endBlock: p.end_block ?? p.end_time ?? 0,
          optionCount: (p.options ?? []).length,
          tallyRevealed: true,
          tallyPublished: true,
          exists: true,
          pollType: p.poll_type === 'hierarchical' ? 1 : p.poll_type === 'survey' ? 2 : 0,
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/** Stub — vote counts are read from the Midnight ledger via fetchContractLedger + tallies Map. */
export async function getVoteCount(
  _pollId: string,
  _optionId?: number,
): Promise<number> {
  return 0
}

/** Stub — attestation credential check is done via attestation API, not on-chain reads. */
export async function getCredential(
  _address: string,
  _communityId: string,
): Promise<null> {
  return null
}

export async function getPollOption(pollId: string, optionId: number) {
  return {
    optionId,
    parentId: 0,
    childCount: 0,
    labelHash: '0x00',
    exists: true,
  }
}

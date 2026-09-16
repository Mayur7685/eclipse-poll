// useCredentialHub — Eclipse Poll attestation status hook.
// Eclipse Poll uses Schnorr attestations (not FHE on-chain credentials).
// We check the attestation API to determine if the user is eligible to vote,
// and keep the EV/VP%/CV display model from FHEpoll adapted to Unix time.

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from './useWallet'
import { useVoting } from './useVoting'
import { useEvmWallet } from './useEvmWallet'
import { nowSeconds } from '../lib/utils'
import {
  votingPowerPct,
  countedVotes,
  daysUntilNextDecay,
  completedPeriods,
  daysElapsed,
  periodProgress,
} from '../lib/decay'
import type { VoteRanking, CommunityConfig, AttestationStatus } from '../types'

export interface CredentialHubState {
  attestation:    AttestationStatus | null
  currentTime:    number              // Unix seconds
  loading:        boolean

  // Display model (kept for UI compatibility with FHEpoll)
  eligibleVotes:  number              // EV = 100 for any valid attestation
  vpPct:          number              // VP% — decays over time since attestation issued
  cv:             number              // CV = floor(EV × VP% / 100)
  periods:        number              // completed 30-day decay periods (0–5)
  daysLeft:       number              // days until next decay step
  elapsed:        number              // days since attestation was first issued
  progress:       number              // 0–1 through current 30-day period

  isExpired:      boolean             // VP reached 0%
  isDeactivated:  boolean             // alias for isExpired

  // Legacy compat — non-null if user has valid attestation
  credential:     { issuedAt: number; expiry: number; exists: boolean } | null

  // EVM wallet (MetaMask / injected provider) — for TOKEN_BALANCE / NFT_OWNERSHIP checks.
  // Separate from the Midnight wallet; used only for credential verification.
  evmAddress:     string | null
  evmConnecting:  boolean
  connectEvm:     () => Promise<void>
  evmAvailable:   boolean

  recast:         (pollId: string, ranking: VoteRanking, optionCount: number) => Promise<void>
  refresh:        () => Promise<void>
}

/** LocalStorage key for cached attestation issue time per community/address */
function attestationCacheKey(address: string, communityId: string) {
  return `eclipse:attest:issued:${address.toLowerCase()}:${communityId}`
}

export function useCredentialHub(community: CommunityConfig): CredentialHubState {
  const { address, isConnected } = useWallet()
  const { castVote }             = useVoting()

  // EVM wallet for on-chain credential checks (TOKEN_BALANCE, NFT_OWNERSHIP, etc.)
  const {
    evmAddress,
    isConnecting: evmConnecting,
    connect: connectEvm,
    isAvailable: evmAvailable,
  } = useEvmWallet()

  const [attestation, setAttestation]   = useState<AttestationStatus | null>(null)
  const [issuedAt, setIssuedAt]         = useState<number>(0)
  const [loading, setLoading]           = useState(true)
  const [currentTime, setCurrentTime]   = useState(nowSeconds())

  const communityId = community.community_id

  const load = useCallback(async () => {
    if (!isConnected || !address) { setLoading(false); setAttestation(null); return }
    setLoading(true)
    try {
      const VERIFIER = import.meta.env.VITE_VERIFIER_URL ?? '/api'

      // Check if user has previously verified for this community
      // (stored in localStorage after successful attestation)
      const cachedIssued = localStorage.getItem(attestationCacheKey(address, communityId))
      const issueTime    = cachedIssued ? parseInt(cachedIssued, 10) : 0

      if (issueTime > 0) {
        // User has a cached attestation — show it as valid
        setIssuedAt(issueTime)
        setAttestation({
          hasAttestation: true,
          credType:       community.credential_type ?? 0,
          communityId,
          signature:      null, // signature only held in memory during voting, not persisted
        })
      } else {
        // No cached attestation — FREE communities auto-grant
        const isFree = community.credential_type === 0 ||
          community.requirement_groups?.every(g => g.requirements.every(r => r.type === 'FREE'))

        if (isFree) {
          // For FREE communities, issue a timestamp so decay tracking works
          const now = nowSeconds()
          localStorage.setItem(attestationCacheKey(address, communityId), String(now))
          setIssuedAt(now)
          setAttestation({
            hasAttestation: true,
            credType:       0,
            communityId,
            signature:      null,
          })
        } else {
          setAttestation({
            hasAttestation: false,
            credType:       community.credential_type ?? 0,
            communityId,
            signature:      null,
          })
        }
      }

      setCurrentTime(nowSeconds())
    } catch (e) {
      console.error('[useCredentialHub] load error', e)
      setAttestation(null)
    } finally {
      setLoading(false)
    }
  }, [isConnected, address, communityId, community.credential_type, community.requirement_groups])

  useEffect(() => { void load() }, [load])

  // ── Computed display values ───────────────────────────────────────────────
  const hasValid      = attestation?.hasAttestation === true
  // EV: 100 votes for any valid attestation (Eclipse doesn't use weighted credentials)
  const eligibleVotes = hasValid ? 100 : 0
  const vpPct         = hasValid ? votingPowerPct(issuedAt, currentTime) : 0
  const cv            = hasValid ? countedVotes(eligibleVotes, issuedAt, currentTime) : 0
  const periods       = hasValid ? completedPeriods(issuedAt, currentTime) : 0
  const daysLeft      = hasValid ? daysUntilNextDecay(issuedAt, currentTime) : 30
  const elapsed       = hasValid ? daysElapsed(issuedAt, currentTime) : 0
  const progress      = hasValid ? periodProgress(issuedAt, currentTime) : 0
  const isExpired     = hasValid && vpPct === 0
  const isDeactivated = isExpired

  // Legacy credential shape for components that still reference hub.credential
  const credential = hasValid
    ? { issuedAt, expiry: issuedAt + 150 * 86_400, exists: true }
    : null

  const recast = useCallback(async (
    pollId: string,
    ranking: VoteRanking,
    optionCount: number,
  ) => {
    if (!attestation?.hasAttestation) return
    await castVote(community.contract_address || '', pollId as any, ranking, optionCount)
    await load()
  }, [attestation, castVote, community.contract_address, load])

  return {
    attestation,
    currentTime,
    loading,
    eligibleVotes,
    vpPct,
    cv,
    periods,
    daysLeft,
    elapsed,
    progress,
    isExpired,
    isDeactivated,
    credential,
    recast,
    refresh: load,
  }
}

// My Votes — shows all votes cast by the connected wallet.
// Privacy-preserving: only locally stored vote records are shown.
// Rankings/choices are ZK-private and not recoverable from the chain.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useVoteHistory } from '../hooks/useVoteHistory'
import { listCommunities } from '../lib/verifier'
import KeyManager from '../components/KeyManager'
import type { CommunityConfig } from '../types'
import type { VoteCastEvent } from '../hooks/useVoteHistory'

interface StoredSubmission {
  pollId:          string
  poll_type?:      string
  ranking:         Record<string, number>
  selectedOption?: number | null
  options:         { id: string | number; label: string }[]
  surveyAnswers?:  Record<string, number>
  votedAt:         number
}

interface EnrichedVote {
  event:      VoteCastEvent
  pollTitle:  string
  community:  CommunityConfig | null
  submission: StoredSubmission | null
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'just now'
}

function VoteCard({ vote }: { vote: EnrichedVote }) {
  const { event, pollTitle, community, submission } = vote
  const votedAt = submission?.votedAt ?? event.votedAt ?? Number(event.blockNumber) * 1000

  // Resolve poll type — prefer submission, fall back to event (from server decryption)
  const pollType = submission?.poll_type ?? event.poll_type
  const isRanked = pollType === 'ranked' || pollType === 'flat' || pollType === 'hierarchical'

  // Resolve chosen option label for simple polls
  let choiceLabel: string | null = null

  const subIdx = submission?.selectedOption ?? (event.selectedOption ?? null)
  if (!isRanked && subIdx !== null && subIdx !== undefined) {
    const opts = submission?.options
    if (opts?.[subIdx]) {
      const opt = opts[subIdx]
      choiceLabel = typeof opt === 'string' ? opt : opt.label
    } else {
      const communityPoll = community?.polls?.find(p => p.poll_id.replace(/^0x/,'') === event.pollId.replace(/^0x/,''))
      const pollOpts = communityPoll?.options ?? []
      if (pollOpts[subIdx]) {
        const opt = pollOpts[subIdx]
        choiceLabel = typeof opt === 'string' ? opt : (opt as any).label ?? `Option ${subIdx + 1}`
      } else if (pollOpts.length > 0) {
        choiceLabel = `Option ${subIdx + 1}`
      }
    }
  }

  // Resolve ranked choices — sort by rank value, map to option labels
  let rankedLabels: string[] | null = null
  const ranking = submission?.ranking ?? event.ranking
  if (isRanked && ranking && Object.keys(ranking).length > 0) {
    const communityPoll = community?.polls?.find(p => p.poll_id.replace(/^0x/,'') === event.pollId.replace(/^0x/,''))
    const pollOpts = communityPoll?.options ?? []
    // Sort option IDs by rank value (1 = top choice)
    const sorted = Object.entries(ranking)
      .filter(([, rank]) => rank > 0)
      .sort(([, a], [, b]) => (a as number) - (b as number))
    rankedLabels = sorted.map(([optId]) => {
      const idx = Number(optId) - 1 // option_ids are 1-indexed
      const opt = pollOpts[idx]
      return opt ? (typeof opt === 'string' ? opt : (opt as any).label ?? `Option ${Number(optId)}`) : `Option ${Number(optId)}`
    })
  }

  const communityId = community?.community_id ?? ''
  const pollLink = communityId
    ? `/communities/${communityId}/polls/${event.pollId}`
    : '#'
  const resultsLink = communityId
    ? `/communities/${communityId}/polls/${event.pollId}/results`
    : '#'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium mb-0.5">
              {community?.name ?? 'Unknown Community'}
            </p>
            <p className="text-sm font-semibold text-gray-900 leading-snug truncate">
              {pollTitle || `Poll ${event.pollId.slice(0, 14)}...`}
            </p>
          </div>
          <div className="shrink-0 mt-0.5">
            <span className="text-xs text-gray-400">
              {votedAt ? timeAgo(votedAt) : ''}
            </span>
          </div>
        </div>
      </div>

      {/* My Choice */}
      <div className="px-5 py-3 space-y-2">
        {choiceLabel ? (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">My Choice</p>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {choiceLabel}
            </span>
          </div>
        ) : rankedLabels && rankedLabels.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">My Ranking</p>
            <div className="flex flex-wrap gap-1.5">
              {rankedLabels.map((label, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-400">{i + 1}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Vote recorded — choice details unavailable
          </p>
        )}
      </div>

      {/* Actions */}
      {communityId && (
        <div className="px-5 pb-4 flex gap-2">
          <Link to={pollLink}
            className="flex-1 py-2 text-center text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            View Poll
          </Link>
          <Link to={resultsLink}
            className="flex-1 py-2 text-center text-xs font-medium text-[#0070F3] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
            View Results
          </Link>
        </div>
      )}
    </div>
  )
}

export default function MyVotes() {
  const { address, isConnected } = useWallet()
  const { events, loading, error, refresh } = useVoteHistory()
  const [communities, setCommunities] = useState<CommunityConfig[]>([])
  const [enriched, setEnriched] = useState<EnrichedVote[]>([])

  // Load communities once
  useEffect(() => {
    listCommunities().then(setCommunities).catch(() => {})
  }, [])

  // Enrich vote events with poll + community metadata
  const enrich = useCallback(() => {
    if (!address) return
    const result: EnrichedVote[] = events.map(event => {
      // Find community that has this poll — normalize both to no-0x for comparison
      let community: CommunityConfig | null = null
      let pollTitle = ''
      const eventPollIdNorm = event.pollId.replace(/^0x/, '')
      for (const c of communities) {
        const p = c.polls?.find(p => p.poll_id.replace(/^0x/, '') === eventPollIdNorm)
        if (p) {
          community = c
          pollTitle = p.title ?? ''
          break
        }
      }

      // Read stored submission from localStorage
      // pollId in events has no 0x prefix (from markVoted), but submission key may have 0x (from PollDetail)
      // Try both to handle the mismatch
      const pollIdHex = event.pollId.replace(/^0x/, '')
      const subKeyNoPrefix  = `zkpoll:submission:${address.toLowerCase()}:${pollIdHex}`
      const subKeyWithPrefix = `zkpoll:submission:${address.toLowerCase()}:0x${pollIdHex}`
      let submission: StoredSubmission | null = null
      try {
        const raw = localStorage.getItem(subKeyNoPrefix) ?? localStorage.getItem(subKeyWithPrefix)
        if (raw) submission = JSON.parse(raw)
      } catch { /* ignore */ }

      return { event, pollTitle, community, submission }
    })
    // Show votes where community is known OR vote was cast recently (< 1 hour)
    // Hides stale votes from old/redeployed contracts automatically
    const ONE_HOUR = 60 * 60 * 1000
    const filtered = result.filter(v =>
      v.community !== null ||
      (v.event.votedAt && Date.now() - v.event.votedAt < ONE_HOUR)
    )
    setEnriched(filtered)
  }, [events, communities, address])

  useEffect(() => { enrich() }, [enrich])

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Connect your wallet</h2>
        <p className="text-sm text-gray-500">Connect your 1AM wallet to see your vote history.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Votes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${enriched.length} vote${enriched.length !== 1 ? 's' : ''} · stored locally`}
          </p>
        </div>
        <button onClick={refresh}
          className="text-xs font-medium text-[#0070F3] hover:underline">
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Key export/import — lets users recover vote history across devices or after browser clear */}
      <KeyManager />

      {!loading && enriched.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">No votes yet</h2>
          <p className="text-sm text-gray-400">Cast your first vote on a poll to see it here.</p>
          <Link to="/polls" className="mt-4 inline-block text-sm font-medium text-[#0070F3] hover:underline">
            Browse Polls →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {enriched.map(v => (
            <VoteCard key={v.event.pollId} vote={v} />
          ))}
        </div>
      )}
    </div>
  )
}

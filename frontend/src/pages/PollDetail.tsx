import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { useVoting } from '../hooks/useVoting'
import { useToast } from '../components/Toast'
import { getPoll, getBlockHeight } from '../lib/utils'
import { getCommunityById } from '../lib/verifier'
import { vpTextColour } from '../lib/decay'
import LayerNavbar from '../components/LayerNavbar'
import type { BreadcrumbEntry } from '../components/LayerNavbar'
import OptionLayer from '../components/OptionLayer'
import VotingMode from '../components/VotingMode'
import VoteConfirmModal from '../components/VoteConfirmModal'
import type { Poll, PollOption, VoteRanking, CommunityConfig } from '../types'

// ── EV / VP% / CV strip shown above the Submit button ────────────────────────
function CredentialBar({ community }: { community: CommunityConfig }) {
  // Credentials frozen — all polls open // const { credential, eligibleVotes, vpPct, cv, loading } = useCredentialHub(community)

  if (loading) return null


  const vpColour = vpTextColour(vpPct)
  const vpStr = vpPct % 1 === 0 ? `${vpPct}%` : `${vpPct.toFixed(2)}%`

  return (
    <div className="flex items-center divide-x divide-gray-100 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
      {[
        { label: 'EV', value: eligibleVotes.toLocaleString(), colour: 'text-gray-800' },
        { label: 'VP', value: vpStr, colour: vpColour },
        { label: 'CV', value: cv.toLocaleString(), colour: 'text-gray-800' },
      ].map(({ label, value, colour }) => (
        <div key={label} className="flex-1 flex flex-col items-center py-2">
          <span className={`text-sm font-semibold tabular-nums ${colour}`}>{value}</span>
          <span className="text-[10px] text-gray-400 font-mono">{label}</span>
        </div>
      ))}
      <div className="flex-[2] flex items-center justify-center px-3 py-2">
        <span className="text-xs text-gray-500">
          Your vote counts as <strong className="text-gray-800">{cv}</strong>
        </span>
      </div>
    </div>
  )
}

// ── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ step }: { step: number }) {
  const steps = ['Connect', 'Browse', 'Rank', 'Confirm', 'Done']
  return (
    <div className="flex items-center w-full px-2 py-6">
      {steps.map((label, i) => {
        const done    = i < step
        const active  = i === step
        const pending = i > step
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold transition-all
              ${done   ? 'bg-[#10B981] text-white' : ''}
              ${active ? 'bg-[#0070F3] text-white shadow-sm ring-4 ring-blue-50' : ''}
              ${pending ? 'bg-white border-2 border-gray-200 text-gray-400' : ''}
            `}>
              {done ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-[2px] -mx-1 z-0 transition-colors ${i < step ? 'bg-[#10B981]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PollDetail() {
  const { communityId, pollId } = useParams<{ communityId: string; pollId: string }>()
  const { address, isConnected } = useWallet()
  const { castVote, castSimple, status, txHash: txId, error } = useVoting()
  const toast = useToast()

  const [poll, setPoll]             = useState<Poll | null>(null)
  const [community, setCommunity]   = useState<CommunityConfig | null>(null)
  const [pollLoading, setPollLoading] = useState(true)
  const [currentBlock, setCurrentBlock] = useState(0)

  const [alreadyVoted, setAlreadyVoted] = useState(false)

  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([{ optionId: 0, label: 'Root' }])
  const currentParentId = breadcrumb[breadcrumb.length - 1]?.optionId ?? 0

  const [tab, setTab]             = useState<'browse' | 'vote'>('vote')
  const [ranking, setRanking]     = useState<VoteRanking>({})
  // MDCT per-layer rankings for hierarchical polls: Map<parentId, VoteRanking>
  const [layerRankings, setLayerRankings] = useState<Map<number, VoteRanking>>(new Map())
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [noCredential, setNoCredential] = useState<'missing' | 'sync' | null>(null)

  // Fetch poll: merge on-chain meta (active status) with off-chain metadata (title + options)
  useEffect(() => {
    if (!pollId || !communityId) return
    setPollLoading(true)

    // Check if already voted from localStorage
    if (address && pollId) {
      import('../lib/utils').then(({ hasVotedOn }) => {
        setAlreadyVoted(hasVotedOn(pollId.replace(/^0x/, ''), address))
      })
    }

    Promise.all([
      getPoll(pollId as `0x${string}`).catch((e) => { console.warn('[PollDetail] getPoll failed:', e); return null }),
      getCommunityById(communityId),
      getBlockHeight().catch(() => 0),
    ]).then(([onChainPoll, community, block]) => {
      if (block) setCurrentBlock(block)
      if (!onChainPoll?.exists && !community) { setPollLoading(false); return }

      const backendPoll = community?.polls?.find(p => p.poll_id === pollId)

      const options: PollOption[] = (backendPoll?.options ?? []).map((o: any, idx: number) => {
        if (typeof o === 'string') {
          return {
            option_id: idx + 1,
            label: o,
            parent_option_id: 0,
            child_count: 0,
          };
        }
        return {
          option_id: o.option_id ?? (idx + 1),
          label: o.label ?? String(o),
          parent_option_id: o.parent_option_id ?? 0,
          child_count: o.child_count ?? 0,
        };
      });

      // Active = on-chain endBlock is in the future.
      // If on-chain fetch failed, assume open (contract will reject the vote if truly closed).
      const onChainActive = onChainPoll?.exists
        ? block <= Number(onChainPoll.endBlock)
        : true

      setPoll({
        poll_id:                  pollId,
        community_id:             communityId,
        title:                    backendPoll?.title ?? '',
        description:              backendPoll?.description,
        required_credential_type: onChainPoll?.credType ?? backendPoll?.required_credential_type ?? community?.credential_type ?? 1,
        created_at:               onChainPoll?.startBlock ?? backendPoll?.created_at_block ?? 0,
        active:                   onChainActive,
        end_block:                onChainPoll?.exists ? Number(onChainPoll.endBlock) : backendPoll?.end_block,
        options,
        poll_type: onChainPoll?.pollType === 2 || backendPoll?.poll_type === 'hierarchical'
          ? 'hierarchical'
          : onChainPoll?.pollType === 1 || backendPoll?.poll_type === 'flat'
          ? 'flat'
          : onChainPoll?.pollType === 3 || backendPoll?.poll_type === 'survey'
          ? 'survey'
          : 'simple',
      })

      setCommunity(community ?? null)
    }).finally(() => setPollLoading(false))
  }, [pollId, communityId])



  // Persist submission so My Votes can display ranked options.
  // 1. localStorage — instant, works offline.
  // 2. Verifier server — cross-device, survives localStorage clears (Render + Pinata backup).
  useEffect(() => {
    if (status !== 'done' || !poll || !address) return
    const votedAt = Date.now()
    const submissionData = {
      pollId:  pollId!,
      poll_type: poll.poll_type,
      ranking: poll.poll_type === 'simple'
        ? { [String((selectedOption ?? 0) + 1)]: 1 }
        : poll.poll_type === 'hierarchical'
          ? Object.fromEntries(
              Array.from(layerRankings.values()).flatMap(r => Object.entries(r))
            )
          : ranking,
      selectedOption: poll.poll_type === 'simple' ? selectedOption : undefined,
      options: poll.options.map(o => ({ id: o.option_id, label: o.label, parentId: o.parent_option_id })),
      votedAt,
    }
    // 1. localStorage cache
    try {
      localStorage.setItem(
        `zkpoll:submission:${address.toLowerCase()}:${(pollId ?? "").replace(/^0x/, "")}`,
        JSON.stringify(submissionData),
      )
    } catch { /* quota exceeded — non-fatal */ }

    // Note: server-side encrypted persistence is handled by useVoting.ts (saveEncryptedVote)
    // No duplicate save needed here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Show toast / no-credential prompt when vote status resolves
  useEffect(() => {
    if (status === 'done') {
      setAlreadyVoted(true)
      if (txId) toast.success('Vote cast on Midnight Network! ✓', txId)
    } else if (status === 'error') {
      if (error === 'NO_CREDENTIAL_SYNC') {
        setNoCredential('sync')
      } else if (error === 'NO_CREDENTIAL') {
        setNoCredential('missing')
      } else if (error === 'ALREADY_VOTED') {
        toast.error('You have already voted on this poll. Each address can only vote once.')
      } else if (error) {
        toast.error(error)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  function drillIn(option: PollOption) {
    setBreadcrumb(prev => [...prev, { optionId: option.option_id, label: option.label }])
  }
  function navigateTo(index: number) {
    setBreadcrumb(prev => prev.slice(0, index + 1))
  }

  const hasRanked = poll?.poll_type === 'hierarchical'
    ? Array.from(layerRankings.values()).some(r => Object.values(r).some(v => v > 0))
    : Object.values(ranking).some(r => r > 0)
  const rankedCount = poll?.poll_type === 'hierarchical'
    ? Array.from(layerRankings.values()).reduce((acc, r) => acc + Object.values(r).filter(v => v > 0).length, 0)
    : Object.values(ranking).filter(r => r > 0).length
  const isDone      = status === 'done' || alreadyVoted
  // Closed = on-chain active flag is false. Don't use local end_block — it may be stale.
  const isPollClosed = poll !== null && !poll.active
  const layerOptions = poll?.options.filter(o => o.parent_option_id === currentParentId) ?? []

  // Step index: 0=Connect, 1=Browse, 2=Rank, 3=Confirm, 4=Done
  const step = isDone ? 4 : !isConnected ? 0 : tab === 'browse' ? 1 : showConfirm ? 3 : 2

  const handleConfirmVote = async () => {
    if (!communityId || !pollId || !address) return
    setShowConfirm(false)
    setNoCredential(null)

    const { fromHex } = await import('../lib/midnight')
    const pollIdBytes = fromHex(pollId.replace(/^0x/, '').padStart(64, '0'))
    const type = poll!.poll_type

    if (type === 'simple' && selectedOption !== null) {
      // Simple single-choice vote — uses castBinaryVote circuit
      await castSimple('', pollIdBytes, selectedOption)
    } else if (type === 'hierarchical') {
      // Hierarchical ranked vote — merge all layer rankings
      const merged: VoteRanking = {}
      if (layerRankings instanceof Map) {
        for (const r of layerRankings.values()) Object.assign(merged, r)
      } else {
        Object.assign(merged, layerRankings)
      }
      await castVote('', pollIdBytes, merged, poll!.options.length)
    } else if (type === 'flat') {
      // Standard flat ranked choice vote
      await castVote('', pollIdBytes, ranking, poll!.options.length)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pollLoading) return (
    <div className="max-w-md mx-auto w-full">
      <div className="bg-white rounded-4xl border border-gray-100 shadow-xl p-8 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Loading poll…</span>
        </div>
      </div>
    </div>
  )

  if (!poll) return (
    <div className="max-w-md mx-auto w-full">
      <Link to={`/communities/${communityId}`}
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors group">
        <svg className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </Link>
      <div className="bg-white rounded-4xl border border-gray-100 shadow-xl p-8 text-center">
        <p className="text-gray-500 text-sm">Poll not found.</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto w-full">

      {/* Back link */}
      <Link
        to={`/communities/${communityId}`}
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors group"
      >
        <svg className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </Link>

      {isDone ? (
        // ── Already voted / Success ───────────────────────────────────────
        <div className="bg-white rounded-4xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="px-4 sm:px-8 pt-10 pb-6"><Stepper step={4} /></div>
          <div className="px-6 pb-3">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{poll?.title}</h1>
          </div>
          <div className="px-4 sm:px-8 pb-10 flex flex-col items-center text-center gap-4">
            {alreadyVoted && status !== 'done' ? (
              // Already voted in a previous session — warn clearly
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Already Voted</h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  Your wallet has already cast a vote in this poll. Each address can only vote once.
                  To vote with a different address, switch wallets.
                </p>
              </>
            ) : (
              // Just submitted this session
              <>
                <div className="w-16 h-16 rounded-full bg-[#10B981] flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900">Vote Submitted!</h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  Your rankings are encrypted on-chain. The tally will be updated by the operator.
                </p>
                {txId && (
                  <a href={`https://explorer.1am.xyz/tx/${txId}?network=preprod`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-[#0070F3] hover:underline">
                    View transaction ↗
                  </a>
                )}
              </>
            )}
            <Link to={`/communities/${communityId}/polls/${pollId}/results`}
              className="mt-2 bg-[#0070F3] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm">
              View Results
            </Link>
          </div>
        </div>
      ) : (
        // ── Main vote card ───────────────────────────────────────────────
        <div className="bg-white rounded-4xl border border-gray-100 shadow-xl flex flex-col" >

          {/* Poll title — shown prominently at top */}
          <div className="px-6 pt-6 pb-0 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                {poll.title}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {poll.poll_type === 'simple' ? 'Pick your choice' : poll.poll_type === 'hierarchical' ? 'Rank by layer' : tab === 'browse' ? 'Browse options' : 'Rank your choices'}
              </p>
            </div>
            <Link to={`/communities/${communityId}/polls/${pollId}/results`}
              className="text-xs text-[#0070F3] font-medium hover:underline shrink-0">
              Results →
            </Link>
          </div>

          {/* Stepper */}
          <div className="shrink-0 px-4 sm:px-8 pt-0 pb-0">
            <Stepper step={step} />
          </div>

          {/* Tabs (only when isConnected and poll is open) */}
          {isConnected && !isPollClosed && !isDone && (
            <div className="px-6 pb-3">
              <div className="flex gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
                <button
                  type="button"
                  onClick={() => setTab('browse')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === 'browse' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Browse
                </button>
                <button
                  type="button"
                  onClick={() => setTab('vote')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === 'vote' ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Vote
                </button>
              </div>
            </div>
          )}

          {/* Poll closed banner */}
          {isPollClosed && (
            <div className="mx-6 mb-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <p className="text-sm font-medium text-gray-600">This poll has closed. Voting is no longer available.</p>
              <Link to={`/communities/${communityId}/polls/${pollId}/results`}
                className="ml-auto text-xs text-[#0070F3] font-medium hover:underline shrink-0">
                View Results →
              </Link>
            </div>
          )}

          {/* Not isConnected */}
          {!isConnected && (
            <div className="mx-6 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-700 font-medium">Connect your wallet to vote.</p>
            </div>
          )}

          {/* Credential prompt hidden — all polls open */}
          {false && noCredential && isConnected && (
            <div className="mx-6 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <div>
                {noCredential === 'sync' ? (
                  <>
                    <p className="text-sm text-amber-700 font-medium">Credential not synced to wallet yet.</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Your credential is confirmed on-chain but the wallet hasn't indexed it yet.
                      Wait 1–2 minutes, then{' '}
                      <button onClick={() => setNoCredential(null)} className="underline font-medium">try again</button>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-amber-700 font-medium">No credential found for this community.</p>
                    <Link to={`/communities/${communityId}`}
                      className="text-xs text-amber-700 underline mt-0.5 inline-block font-medium">
                      Get credential on the community page →
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Main scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-4 px-6">
            {tab === 'browse' || !isConnected ? (
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white flex flex-col shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <LayerNavbar breadcrumb={breadcrumb} onNavigate={navigateTo} />
                </div>
                <div className="p-3 flex flex-col gap-2">
                  <OptionLayer
                    options={poll.options}
                    parentId={currentParentId}
                    snapshots={new Map()}
                    onDrillIn={drillIn}
                  />
                </div>
                <div className="bg-[#0070F3] text-white px-5 py-3 text-xs font-medium flex items-center justify-between">
                  <span>Click › to explore sub-options.</span>
                  {isConnected && !isPollClosed && (
                    <button
                      onClick={() => setTab('vote')}
                      className="bg-white text-[#0070F3] px-3 py-1 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-sm text-xs"
                    >
                      Proceed to Vote →
                    </button>
                  )}
                </div>
              </div>
            ) : poll.poll_type === 'simple' ? (
              /* Simple poll — radio button single choice */
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400 font-medium">Select one option</p>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  {poll.options.map((opt, idx) => (
                    <button key={opt.option_id} type="button"
                      onClick={() => setSelectedOption(idx)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        selectedOption === idx
                          ? 'border-[#0070F3] bg-blue-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedOption === idx ? 'border-[#0070F3]' : 'border-gray-300'
                      }`}>
                        {selectedOption === idx && <div className="w-2.5 h-2.5 rounded-full bg-[#0070F3]" />}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <div className="bg-[#0070F3] text-white px-5 py-3 text-xs font-medium">
                  Select an option to enable voting.
                </div>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white flex flex-col shadow-sm">
                {/* Same breadcrumb nav as Browse so user can drill into sub-options */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <LayerNavbar breadcrumb={breadcrumb} onNavigate={navigateTo} />
                </div>
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">
                    Tap to rank · tap again to remove · click <span className="text-[#0070F3]">sub ›</span> to rank inside a category
                  </p>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  <VotingMode
                    options={layerOptions}
                    value={poll.poll_type === 'hierarchical'
                      ? (layerRankings.get(currentParentId) ?? {})
                      : ranking}
                    onChange={r => {
                      if (poll.poll_type === 'hierarchical') {
                        // MDCT: store ranking per sibling group (parentId)
                        setLayerRankings(prev => new Map(prev).set(currentParentId, r))
                      } else {
                        setRanking(r)
                      }
                    }}
                    onDrillIn={drillIn}
                  />
                </div>
                {breadcrumb.length > 1 && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => navigateTo(breadcrumb.length - 2)}
                      className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      ← Back to {breadcrumb[breadcrumb.length - 2]?.label ?? 'Root'}
                    </button>
                  </div>
                )}
                <div className="bg-[#0070F3] text-white px-5 py-3 text-xs font-medium">
                  Rankings span all layers — rank root options and sub-options together.
                </div>
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          {tab === 'vote' && isConnected && !isDone && !isPollClosed && (
            <div className="shrink-0 bg-white pt-4 pb-8 px-6 border-t border-gray-100 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.06)]">
              <div className="flex flex-col items-center gap-3">
                {/* EV / VP% / CV credential strip — hidden while credentials frozen */}
                {false && community && <CredentialBar community={community} />}

                <div className="w-full flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">
                    {poll?.poll_type === 'simple'
                      ? (selectedOption !== null ? `Selected: ${poll.options[selectedOption]?.label}` : 'Tap an option to select')
                      : (hasRanked ? `${rankedCount} option${rankedCount !== 1 ? 's' : ''} ranked` : 'Tap options to rank them')}
                  </span>
                  {(poll?.poll_type === 'simple' ? selectedOption !== null : hasRanked) && (
                    <button onClick={() => { setRanking({}); setLayerRankings(new Map()); setSelectedOption(null) }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                      Clear
                    </button>
                  )}
                </div>
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0070F3] rounded-full transition-all"
                    style={{ width: `${hasRanked ? Math.min(rankedCount / Math.max(layerOptions.length, 1) * 100, 100) : 0}%` }} />
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setTab('browse')}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl text-sm transition-colors">
                    Browse
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={
                      alreadyVoted ||
                      !(poll?.poll_type === 'simple' ? selectedOption !== null : hasRanked) ||
                      status === 'proving' ||
                      status === 'confirming' ||
                      status === 'attesting'
                    }
                    className="flex-1 py-3 bg-[#0070F3] hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {(status === 'proving' || status === 'confirming' || status === 'attesting') && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {alreadyVoted
                      ? 'Already Voted ✓'
                      : status === 'proving'
                      ? 'Generating ZK Proof…'
                      : status === 'confirming'
                      ? 'Waiting for confirmation…'
                      : status === 'attesting'
                      ? 'Checking credentials…'
                      : 'Submit Vote'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfirm && poll && (
        <VoteConfirmModal
          ranking={ranking}
          options={poll.options}
          pollType={poll.poll_type}
          pollTitle={poll.title}
          selectedOption={selectedOption}
          submitting={status === 'signing'}
          onConfirm={() => void handleConfirmVote()}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}

// CredentialHub — MetaPoll-style voting eligibility panel for CommunityDetail.
// Shows EV / VP% / CV numbers, decay bar, and credential issuance flow.

import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useVoting } from '../hooks/useVoting'
import { useCredentials } from '../contexts/CredentialContext'
import { useCredentialHub } from '../hooks/useCredentialHub'
import { getCredentialParams } from '../lib/verifier'
import ConnectorSelector from './ConnectorSelector'
import type { CommunityConfig, ConnectedAccount, CheckResult, Requirement } from '../types'

const DEFAULT_WEIGHTS: Record<string, number> = {
  FREE: 100, ALLOWLIST: 100, TOKEN_BALANCE: 10, NFT_OWNERSHIP: 10,
  ONCHAIN_ACTIVITY: 3, DOMAIN_OWNERSHIP: 5, X_FOLLOW: 2,
  DISCORD_MEMBER: 5, DISCORD_ROLE: 5,
}

const REQ_LABELS: Record<string, string> = {
  FREE: 'Open access', ALLOWLIST: 'Allowlist', TOKEN_BALANCE: 'Token Balance',
  NFT_OWNERSHIP: 'NFT Ownership', ONCHAIN_ACTIVITY: 'On-chain Activity',
  DOMAIN_OWNERSHIP: 'Domain Ownership', X_FOLLOW: 'X / Twitter Follow',
  DISCORD_MEMBER: 'Discord Member', DISCORD_ROLE: 'Discord Role',
  GITHUB_ACCOUNT: 'GitHub Account', TELEGRAM_MEMBER: 'Telegram Member',
}

function ReqIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4 shrink-0'
  switch (type) {
    case 'X_FOLLOW':
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
    case 'DISCORD_MEMBER':
    case 'DISCORD_ROLE':
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057c.003.024.016.045.036.058a19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.036-.057c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
    case 'GITHUB_ACCOUNT':
      return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
    case 'TOKEN_BALANCE':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h3.75a1.75 1.75 0 110 3.5H9.5m0 0h4a2 2 0 110 4H9.5"/></svg>
    case 'NFT_OWNERSHIP':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    case 'ONCHAIN_ACTIVITY':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    case 'ALLOWLIST':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
    case 'FREE':
    case 'DOMAIN_OWNERSHIP':
    default:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
  }
}

function reqDetail(req: Requirement): string | null {
  const p = req.params
  switch (req.type) {
    case 'X_FOLLOW':        return p.handle ? `Follow ${p.handle}` : null
    case 'DISCORD_MEMBER':  return p.serverId ? `Server ID: ${p.serverId}` : null
    case 'DISCORD_ROLE':    return p.roleId ? `Role ID: ${p.roleId}` : null
    case 'GITHUB_ACCOUNT':
      if (p.starredRepo)  return `Starred ${p.starredRepo}`
      if (p.commitsRepo)  return `${p.minCommits ?? 1}+ commits in ${p.commitsRepo}`
      if (p.orgName)      return `Member of ${p.orgName}`
      if (p.minRepos)     return `${p.minRepos}+ public repos`
      if (p.minFollowers) return `${p.minFollowers}+ followers`
      return 'GitHub account required'
    case 'TOKEN_BALANCE':   return p.minAmount ? `Min ${p.minAmount}` : null
    case 'NFT_OWNERSHIP':   return p.contractAddress ? `Contract: ${p.contractAddress.slice(0,8)}…` : null
    case 'ONCHAIN_ACTIVITY': return `${p.minTxCount ?? 1}+ transactions`
    case 'ALLOWLIST':       return `${(p.addresses ?? []).length} addresses`
    case 'DOMAIN_OWNERSHIP': return p.domain ?? null
    default: return null
  }
}

function ThreeNumbers({ ev, vp, cv }: { ev: number; vp: number; cv: number }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
      {[
        { label: 'Eligible Votes', value: ev.toLocaleString(), sub: 'EV' },
        { label: 'Voting Power',   value: `${vp % 1 === 0 ? vp : vp.toFixed(2)}%`, sub: 'VP', colour: vpTextColour(vp) },
        { label: 'Counted Votes',  value: cv.toLocaleString(), sub: 'CV' },
      ].map(({ label, value, sub, colour }) => (
        <div key={sub} className="flex flex-col items-center py-3 px-2 bg-white">
          <span className={`text-lg font-semibold tabular-nums ${colour ?? 'text-gray-900'}`}>{value}</span>
          <span className="text-xs text-gray-400 mt-0.5">{label}</span>
          <span className="text-[10px] font-mono text-gray-300 mt-0.5">{sub}</span>
        </div>
      ))}
    </div>
  )
}

function DecayBar({ progress, daysLeft, periods, vpPct }: {
  progress: number; daysLeft: number; periods: number; vpPct: number
}) {
  if (vpPct === 0) return (
    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center">
      <p className="text-sm font-semibold text-red-600">Vote deactivated</p>
      <p className="text-xs text-red-400 mt-0.5">Credential fully decayed. Renew to restore voting power.</p>
    </div>
  )
  const barColour = vpBarColour(vpPct)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium">Period {periods + 1} of 5</span>
        <span>Decays in <strong className="text-gray-800">{daysLeft} days</strong> → {(vpPct / 2).toFixed(2)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColour}`}
          style={{ width: `${Math.min(progress * 100, 100)}%` }} />
      </div>
    </div>
  )
}

interface Props { community: CommunityConfig }

export default function CredentialHub({ community }: Props) {
  const { address, isConnected, isReconnecting }  = useWallet()
  const hub = useCredentialHub(community)
  const { claimCommunityCredential } = useVoting()
  const { markCredentialClaimed, hasCredential } = useCredentials()

  // If user has already claimed via CredentialsHub page, show as active
  const alreadyClaimed = hasCredential(community.community_id)

  const allReqs      = community.requirement_groups.flatMap(g => g.requirements)
  const isFreeOnly   = allReqs.every(r => r.type === 'FREE')
  const needsEVM     = allReqs.some(r => ['TOKEN_BALANCE','NFT_OWNERSHIP','ONCHAIN_ACTIVITY','DOMAIN_OWNERSHIP','ALLOWLIST'].includes(r.type))
  const needsTwitter = allReqs.some(r => r.type === 'X_FOLLOW')
  const needsDiscord = allReqs.some(r => ['DISCORD_MEMBER','DISCORD_ROLE'].includes(r.type))
  const needsGitHub  = allReqs.some(r => r.type === 'GITHUB_ACCOUNT')
  const needsTelegram = allReqs.some(r => r.type === 'TELEGRAM_MEMBER')
  const needsConnectors = needsEVM || needsTwitter || needsDiscord || needsGitHub || needsTelegram

  const [accounts, setAccounts] = useState<ConnectedAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem('zkpoll:accounts') ?? '[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('zkpoll:accounts', JSON.stringify(accounts)) }, [accounts])

  const [results, setResults]         = useState<CheckResult[] | null>(null)
  const [issuing, setIssuing]         = useState(false)
  const [issueStatus, setIssueStatus] = useState<'idle' | 'issuing' | 'done' | 'error'>('idle')
  const [issueTxHash, setIssueTxHash] = useState<string | null>(null)
  const [issueError, setIssueError]   = useState<string | null>(null)

  const handleGetCredential = async () => {
    if (!isConnected || !address) return
    setIssuing(true); setIssueError(null); setResults(null); setIssueStatus('idle'); setIssueTxHash(null)

    try {
      // 1. Verify eligibility with API
      const evmAddress = address as string
      const res = await getCredentialParams(community.community_id, evmAddress, accounts)
      setResults(res.results ?? null)

      if (!res.passed) {
        setIssueStatus('error')
        setIssueError('Requirements not met. Check items above.')
        setIssuing(false)
        return
      }

      setIssueStatus('issuing')
      setIssuing(false)

      // 2. Submit ZK proof on-chain via claimCommunityCredential circuit
      const result = await claimCommunityCredential(community.community_id, accounts)
      if (!result) {
        setIssueStatus('error')
        setIssueError('ZK proof failed. Check wallet and try again.')
        return
      }

      // 3. Mark claimed in CredentialContext (persists across navigation)
      markCredentialClaimed(community.community_id, community.credential_type ?? 1, result.txHash)
      setIssueTxHash(result.txHash)
      setIssueStatus('done')
      setTimeout(() => void hub.refresh(), 2_000)
    } catch (e: unknown) {
      setIssueError(e instanceof Error ? e.message : String(e))
      setIssueStatus('error')
      setIssuing(false)
    }
  }

  if (hub.loading) return (
    <div className="border border-gray-100 rounded-2xl p-6 bg-white flex items-center justify-center gap-3 shadow-sm">
      <div className="w-4 h-4 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Loading credential status…</span>
    </div>
  )

  // A credential with eligibleVotes === 0 was issued before the votingWeight scaling fix.
  // Treat it the same as "no credential" so the user can re-issue with corrected weight.
  const credBroken = !!hub.credential && hub.eligibleVotes === 0
  // hasCred: either the on-chain credential exists via the hub, OR the user has
  // already claimed it via the CredentialsHub page (CredentialContext)
  const hasCred    = (!!hub.credential && !hub.isExpired && !credBroken) || alreadyClaimed

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
              ${hasCred ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              {hasCred
                ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/></svg>
              }
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Voting Eligibility</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isFreeOnly ? 'Open to everyone' : 'Gated access'}
              </p>
            </div>
          </div>
          {hasCred && (
            <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
              Active credential
            </span>
          )}
          {hub.isExpired && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-1 rounded-full font-medium">
              Expired — renew
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Requirements breakdown */}
        {!isFreeOnly && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Requirements</p>
            {allReqs.map(req => {
              const result = results?.find(r => r.requirementId === req.id)
              const weight = req.params.vote_weight ?? DEFAULT_WEIGHTS[req.type] ?? 1
              return (
                <div key={req.id}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors
                    ${result?.passed === true  ? 'bg-emerald-50 border-emerald-100' :
                      result?.passed === false ? 'bg-red-50 border-red-100' :
                      'bg-gray-50 border-gray-100'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-500"><ReqIcon type={req.type} /></span>
                    <div>
                      <span className="font-medium text-gray-800">{REQ_LABELS[req.type] ?? req.type}</span>
                      {req.chain && (
                        <span className="ml-1.5 text-xs text-gray-400 bg-white border border-gray-100 px-1.5 py-0.5 rounded-full">
                          {req.chain}
                        </span>
                      )}
                      {reqDetail(req) && (
                        <p className="text-xs text-gray-500 mt-0.5">{reqDetail(req)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{weight} vote{weight !== 1 ? 's' : ''}</span>
                    {result && (
                      <span className={`text-xs font-semibold ${result.passed ? 'text-emerald-600' : 'text-red-500'}`}>
                        {result.passed
                          ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {credBroken && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Credential has 0 voting weight</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Issued before a scaling fix. Connect a social account (Twitter, Discord, etc.)
                then click below — this generates a new nullifier so the contract can overwrite
                the broken credential with the correct weight.
              </p>
            </div>
          </div>
        )}

        {isFreeOnly && !hasCred && !credBroken && (
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
            <div>
              <p className="text-sm font-medium text-gray-800">Open to everyone</p>
              <p className="text-xs text-gray-500 mt-0.5">
                No requirements — get a free credential to vote.
              </p>
            </div>
          </div>
        )}

        {/* Account connectors — shown for gated requirements, or when re-issuing a broken credential */}
        {(needsConnectors || credBroken) && !hasCred && issueStatus !== 'done' && (
          <ConnectorSelector accounts={accounts} onChange={setAccounts} />
        )}

        {/* Credential active message */}
        {hasCred && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-emerald-800">Credential active</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                You are eligible to vote in all polls in this community.
              </p>
            </div>
          </div>
        )}

        {/* Issuance feedback */}
        {issueStatus === 'issuing' && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="w-4 h-4 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm text-blue-700 font-medium">Issuing credential on Midnight Network…</p>
          </div>
        )}

        {issueStatus === 'done' && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Attestation issued on Midnight!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Your Schnorr attestation is ready. Refreshing…</p>
              {issueTxHash && (
                <a href={`https://explorer.1am.xyz/tx/${issueTxHash}?network=preprod`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:underline mt-1 block">
                  View transaction ↗
                </a>
              )}
            </div>
          </div>
        )}

        {issueStatus === 'error' && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{issueError ?? 'Requirements not met.'}</p>
          </div>
        )}

        {/* Actions */}
        {isReconnecting ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-4 h-4 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-600">Reconnecting wallet…</span>
          </div>
        ) : !isConnected ? (
          <p className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            Connect your Midnight wallet to check eligibility.
          </p>
        ) : (!hasCred || hub.isExpired) && issueStatus !== 'done' ? (
          <button
            onClick={() => void handleGetCredential()}
            disabled={issuing || issueStatus === 'issuing'}
            className="w-full py-3 bg-[#0070F3] hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(issuing || issueStatus === 'issuing') && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {hub.isExpired || credBroken ? 'Renew Credential' : isFreeOnly ? 'Get Free Credential' : 'Verify & Get Credential'}
          </button>
        ) : null}

        {/* Credential metadata */}
        {hub.credential && (
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
            <span>
              {hub.isExpired
                ? 'Credential expired'
                : `Expires at block ${hub.credential.expiry.toLocaleString()}`}
            </span>
            <span>Issued {hub.elapsed} day{hub.elapsed !== 1 ? 's' : ''} ago</span>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className={`px-5 py-3 text-xs font-medium text-white
        ${hasCred ? 'bg-emerald-500' : 'bg-[#0070F3]'}`}>
        {hasCred
          ? 'Credential active — eligible to vote in this community'
          : isFreeOnly
          ? 'Open community — anyone can vote. One credential per wallet.'
          : 'Verifier checks eligibility off-chain. Your wallet submits on Midnight Network.'}
      </div>
    </div>
  )
}

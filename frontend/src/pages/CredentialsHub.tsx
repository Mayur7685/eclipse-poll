import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useVoting } from '../hooks/useVoting'
import { useCredentials } from '../contexts/CredentialContext'
import { listCommunities } from '../lib/verifier'
import ConnectorSelector from '../components/ConnectorSelector'
import RequirementsPanel from '../components/RequirementsPanel'
import type { CommunityConfig, ConnectedAccount } from '../types'

function StatusBadge({ status }: { status: 'claimed' | 'none' | 'claiming' }) {
  if (status === 'claimed')
    return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">✓ Credential on-chain</span>
  if (status === 'claiming')
    return <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full animate-pulse">Claiming…</span>
  return <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">No credential</span>
}

export default function CredentialsHub() {
  const { address, isConnected, connect } = useWallet()
  const { claimCommunityCredential, status: voteStatus, error: voteError } = useVoting()
  const { hasCredential, markCredentialClaimed } = useCredentials()

  const [communities, setCommunities]         = useState<CommunityConfig[]>([])
  const [loading, setLoading]                 = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [claimingId, setClaimingId]           = useState<string | null>(null)
  const [claimError, setClaimError]           = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    listCommunities()
      .then(setCommunities)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleClaim = useCallback(async (community: CommunityConfig) => {
    if (!isConnected) { void connect(); return; }
    setClaimingId(community.community_id)
    setClaimError(prev => ({ ...prev, [community.community_id]: '' }))

    const result = await claimCommunityCredential(community.community_id, connectedAccounts)

    if (result) {
      markCredentialClaimed(community.community_id, community.credential_type ?? 1, result.txHash)
    } else {
      setClaimError(prev => ({ ...prev, [community.community_id]: voteError ?? 'Failed to claim credential' }))
    }
    setClaimingId(null)
  }, [isConnected, connect, claimCommunityCredential, markCredentialClaimed, connectedAccounts, voteError])

  const gatedCommunities = communities.filter(c => (c.credential_type ?? 0) > 0)
  const freeCommunities  = communities.filter(c => (c.credential_type ?? 0) === 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Credentials Hub</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verify your eligibility once — your credential is stored on-chain via a ZK proof.
          No need to re-verify on every visit or every poll.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">How it works</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { n: '1', title: 'Connect accounts', desc: 'Link your social accounts or EVM wallet for eligibility checks.' },
            { n: '2', title: 'Verify once', desc: 'The API checks your eligibility and issues a Schnorr attestation.' },
            { n: '3', title: 'Claim on-chain', desc: 'Your ZK proof is submitted to the contract — no personal data revealed.' },
          ].map(s => (
            <div key={s.n} className="text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#0070F3] text-white text-sm font-bold flex items-center justify-center mx-auto">{s.n}</div>
              <p className="text-xs font-semibold text-gray-900">{s.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Connected accounts */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Connected Accounts</p>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <ConnectorSelector accounts={connectedAccounts} onChange={setConnectedAccounts} />
        </div>
      </div>

      {/* Wallet gate */}
      {!isConnected && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
          <p className="text-sm text-amber-700 font-medium">Connect your 1AM wallet to claim credentials.</p>
          <button onClick={() => void connect()} className="mt-2 text-xs font-medium text-[#0070F3] hover:underline">Connect Wallet →</button>
        </div>
      )}

      {/* Community credentials */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Community Credentials</p>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && gatedCommunities.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500">No gated communities yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {gatedCommunities.map(community => {
            const claimed  = hasCredential(community.community_id)
            const claiming = claimingId === community.community_id
            const err      = claimError[community.community_id]

            return (
              <div key={community.community_id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {/* Header row */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="text-blue-500 font-semibold text-xs">{community.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{community.name}</p>
                      <p className="text-xs text-gray-400">
                        {(community.requirement_groups ?? []).flatMap(g => g.requirements ?? []).length} requirement(s)
                        · {community.credential_type === 1 ? 'Allowlist' : community.credential_type === 2 ? 'Social OAuth' : 'Gated'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={claimed ? 'claimed' : claiming ? 'claiming' : 'none'} />
                </div>

                {/* Already claimed — show explorer link */}
                {claimed && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-emerald-600 font-medium">
                      ✓ Your credential is stored on-chain. You can vote in all polls in this community without re-verifying.
                    </p>
                  </div>
                )}

                {/* Not yet claimed — show requirements + claim button */}
                {!claimed && isConnected && (
                  <div className="px-5 pb-5 space-y-3">
                    <RequirementsPanel
                      communityId={community.community_id}
                      community={community}
                      groups={community.requirement_groups ?? []}
                      connectedAccounts={connectedAccounts}
                      onAccountsChange={setConnectedAccounts}
                      onCredentialIssued={() => {}}
                    />

                    {err && (
                      <p className="text-xs text-red-500">{err}</p>
                    )}

                    <button
                      disabled={claiming}
                      onClick={() => void handleClaim(community)}
                      className="w-full py-2.5 rounded-full bg-[#0070F3] hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {claiming ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting ZK proof…
                        </>
                      ) : (
                        'Claim Credential On-Chain'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {freeCommunities.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {freeCommunities.length} open communit{freeCommunities.length !== 1 ? 'ies' : 'y'} — no credentials needed.
        </p>
      )}
    </div>
  )
}

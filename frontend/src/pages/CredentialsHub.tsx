import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../hooks/useWallet'
import { listCommunities } from '../lib/verifier'
import { useEvmWallet } from '../hooks/useEvmWallet'
import ConnectorSelector from '../components/ConnectorSelector'
import RequirementsPanel from '../components/RequirementsPanel'
import type { CommunityConfig, ConnectedAccount } from '../types'

function CredentialBadge({ status }: { status: 'active' | 'none' }) {
  if (status === 'active') return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">Credential active</span>
  return <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">No credential</span>
}

export default function CredentialsHub() {
  const { address, isConnected, connect } = useWallet()
  const { evmAddress } = useEvmWallet()
  const [communities, setCommunities] = useState<CommunityConfig[]>([])
  const [loading, setLoading]         = useState(false)
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [issuedMap, setIssuedMap]     = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLoading(true)
    listCommunities()
      .then(setCommunities)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleIssue = useCallback((communityId: string) => {
    setIssuedMap(prev => ({ ...prev, [communityId]: true }))
  }, [])

  const gatedCommunities = communities.filter(c =>
    (c.credential_type ?? 0) > 0 || (c.requirement_groups ?? []).some(g => g.requirements?.some(r => r.type !== 'FREE'))
  )
  const freeCommunities = communities.filter(c =>
    (c.credential_type ?? 0) === 0 && !(c.requirement_groups ?? []).some(g => g.requirements?.some(r => r.type !== 'FREE'))
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Credentials Hub</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your accounts, verify community requirements, and claim attestations on-chain.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">How it works</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { n: '1', title: 'Connect accounts', desc: 'EVM wallet for token/NFT checks, or social accounts for X, Discord, GitHub.' },
            { n: '2', title: 'Verify requirements', desc: 'The verifier checks eligibility off-chain.' },
            { n: '3', title: 'Submit on-chain', desc: 'Your wallet submits the signed attestation — no server key involved.' },
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
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-semibold text-gray-900">Connected Accounts</h2>
          <span className="text-xs text-gray-400">For requirement checks</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <ConnectorSelector accounts={connectedAccounts} onChange={setConnectedAccounts} />
        </div>
      </div>

      {/* Gated communities */}
      {!isConnected && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
          <p className="text-sm text-amber-700 font-medium">Connect your 1AM wallet to view and claim credentials.</p>
          <button onClick={() => void connect()} className="mt-2 text-xs font-medium text-[#0070F3] hover:underline">Connect Wallet →</button>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Community Credentials</h2>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && gatedCommunities.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500">No gated communities yet. All current communities are open to everyone.</p>
          </div>
        )}

        <div className="space-y-3">
          {gatedCommunities.map(community => {
            const credIssued = issuedMap[community.community_id] ?? false
            return (
              <div key={community.community_id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="text-blue-500 font-semibold text-xs">{community.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{community.name}</p>
                      <p className="text-xs text-gray-400">
                        Credential type {community.credential_type} · {(community.requirement_groups ?? []).flatMap(g => g.requirements ?? []).length} requirement{(community.requirement_groups ?? []).flatMap(g => g.requirements ?? []).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <CredentialBadge status={credIssued ? 'active' : 'none'} />
                </div>

                {isConnected && !credIssued && (
                  <div className="px-5 pb-5">
                    <RequirementsPanel
                      communityId={community.community_id}
                      community={community}
                      groups={community.requirement_groups ?? []}
                      connectedAccounts={connectedAccounts}
                      onAccountsChange={setConnectedAccounts}
                      onCredentialIssued={() => handleIssue(community.community_id)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Free communities note */}
      {freeCommunities.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {freeCommunities.length} open communit{freeCommunities.length !== 1 ? 'ies' : 'y'} available — no credentials needed to vote.
        </p>
      )}
    </div>
  )
}

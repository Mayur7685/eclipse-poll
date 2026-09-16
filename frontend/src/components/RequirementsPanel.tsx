// RequirementsPanel — shows community requirement groups, lets the user verify
// eligibility off-chain, then verifier issues Schnorr attestation on-chain.

import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useEvmWallet } from '../hooks/useEvmWallet'
import { getCredentialParams } from '../lib/verifier'
import ConnectorSelector from './ConnectorSelector'
import { useConnectedAccounts } from '../hooks/useConnectedAccounts'
import type { RequirementGroup, ConnectedAccount, CheckResult } from '../types'

/** Small inline button shown next to a social requirement when the account is not yet connected. */
function OAuthConnectButton({
  label,
  providerType,
  onConnect,
  isConnecting,
  isConnected,
}: {
  label: string
  providerType: 'X_TWITTER' | 'DISCORD' | 'GITHUB'
  onConnect: () => Promise<void>
  isConnecting: string | null
  isConnected: boolean
}) {
  if (isConnected) {
    return <span className="text-xs font-semibold text-[#10B981] shrink-0">✓ Connected</span>
  }
  const spinning = isConnecting === providerType
  return (
    <button
      onClick={() => void onConnect()}
      disabled={spinning}
      className="text-xs font-medium text-[#0070F3] border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
    >
      {spinning && (
        <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
      )}
      Connect {label}
    </button>
  )
}

interface Props {
  groups:            RequirementGroup[]
  communityId:       string
  evmAddress:        string
  isConnected:       boolean
  connectedAccounts: ConnectedAccount[]
  onAccountsChange:  (a: ConnectedAccount[]) => void
  onCredentialIssued: () => void
}

const REQ_LABELS: Record<string, string> = {
  FREE:             'Open to everyone',
  ALLOWLIST:        'Allowlist',
  TOKEN_BALANCE:    'Token Balance',
  NFT_OWNERSHIP:    'NFT Ownership',
  ONCHAIN_ACTIVITY: 'On-chain Activity',
  DOMAIN_OWNERSHIP: 'Domain Ownership',
  X_FOLLOW:         'X / Twitter Follow',
  DISCORD_MEMBER:   'Discord Member',
  DISCORD_ROLE:     'Discord Role',
  GITHUB_ACCOUNT:   'GitHub Account',
  TELEGRAM_MEMBER:  'Telegram Member',
}

export default function RequirementsPanel({
  groups,
  communityId,
  evmAddress: midnightEvmAddress,
  isConnected,
  connectedAccounts,
  onAccountsChange,
  onCredentialIssued,
}: Props) {
  const { address } = useWallet()

  // EVM wallet for TOKEN_BALANCE / NFT_OWNERSHIP on-chain checks.
  // Completely separate from the Midnight wallet used for voting.
  const {
    evmAddress: injectedEvmAddress,
    isConnecting: evmConnecting,
    connect: connectEvm,
    isAvailable: evmAvailable,
  } = useEvmWallet()

  const [results, setResults]     = useState<CheckResult[] | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [status, setStatus]       = useState<'idle' | 'issuing' | 'done' | 'error'>('idle')
  const [txHash, setTxHash]       = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const allReqs      = groups.flatMap(g => g.requirements)

  // Requirements that need an injected EVM wallet (MetaMask / window.ethereum).
  // ALLOWLIST uses the Midnight address passed via props (midnightEvmAddress).
  const needsInjectedEvm = allReqs.some(r =>
    ['TOKEN_BALANCE', 'NFT_OWNERSHIP', 'ONCHAIN_ACTIVITY', 'DOMAIN_OWNERSHIP'].includes(r.type)
  )
  const needsEVM     = allReqs.some(r => ['TOKEN_BALANCE','NFT_OWNERSHIP','ONCHAIN_ACTIVITY','DOMAIN_OWNERSHIP','ALLOWLIST'].includes(r.type))
  const needsTwitter = allReqs.some(r => r.type === 'X_FOLLOW')
  const needsDiscord = allReqs.some(r => ['DISCORD_MEMBER','DISCORD_ROLE'].includes(r.type))
  const needsGitHub  = allReqs.some(r => r.type === 'GITHUB_ACCOUNT')
  const needsTelegram= allReqs.some(r => r.type === 'TELEGRAM_MEMBER')
  const needsConnectors = needsEVM || needsTwitter || needsDiscord || needsGitHub || needsTelegram
  const isFreeOnly   = allReqs.every(r => r.type === 'FREE')

  // Prefer the injected EVM address for on-chain checks; fall back to Midnight address.
  const activeEvmAddress = injectedEvmAddress ?? midnightEvmAddress

  // True when an EVM wallet is required but not yet connected.
  const evmWalletNeeded = needsInjectedEvm && !injectedEvmAddress

  const handleVerifyAndIssue = async () => {
    if (!isConnected || !address) return
    setVerifying(true); setError(null); setResults(null); setStatus('idle'); setTxHash(null)

    try {
      // Verifier checks requirements AND issues Schnorr attestation on Midnight directly.
      // No on-chain tx needed from the frontend — verifier wallet pays gas.
      const res = await getCredentialParams(communityId, activeEvmAddress, connectedAccounts)

      if (!res.passed) {
        setResults(res.results)
        setStatus('error')
        setError('Requirements not met. Check the items above.')
        setVerifying(false)
        return
      }

      setStatus('issuing')
      setVerifying(false)

      // Attestation API issued the Schnorr signature — no on-chain tx needed from the frontend.
      // The attestation is used as a witness in the next vote circuit call.
      const hash = res.txHash ?? null
      setTxHash(hash as string | null)
      setStatus('done')
      onCredentialIssued()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
      setVerifying(false)
    }
  }

  return (
    <div className="border-[1.5px] border-[#0070F3] rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Requirement groups */}
      <div className="p-4 space-y-3">
        {groups.map((group, gi) => (
          <div key={group.id}>
            {groups.length > 1 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Group {gi + 1} · {group.logic}
              </p>
            )}
            <div className="space-y-1.5">
              {group.requirements.map(req => {
                const result = results?.find(r => r.requirementId === req.id)
                return (
                  <div
                    key={req.id}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm transition-colors
                      ${result?.passed === true  ? 'bg-green-50 border-green-200' :
                        result?.passed === false ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-100'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0
                        ${result?.passed === true  ? 'bg-[#10B981]' :
                          result?.passed === false ? 'bg-red-400' :
                          'bg-gray-300'}
                      `} />
                      <span className="font-medium text-gray-700">
                        {REQ_LABELS[req.type] ?? req.type}
                      </span>
                      {req.chain && (
                        <span className="text-xs text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded-full">
                          {req.chain}
                        </span>
                      )}
                    </div>
                    {result && (
                      <div className="flex flex-col items-end gap-0.5 min-w-0 max-w-[55%]">
                        <span className={`text-xs font-semibold shrink-0 ${result.passed ? 'text-[#10B981]' : 'text-red-500'}`}>
                          {result.passed ? '✓ PASS' : '✕ FAIL'}
                        </span>
                        {result.error && (
                          <span className="text-[10px] text-red-400 text-right leading-tight">
                            {result.error}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* EVM wallet connection — for TOKEN_BALANCE / NFT_OWNERSHIP checks */}
        {needsInjectedEvm && status !== 'done' && (
          <div className="pt-2">
            {injectedEvmAddress ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-green-200 bg-green-50 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                <span className="text-green-700 font-medium">EVM Wallet</span>
                <span className="font-mono text-xs text-green-600 truncate">
                  {injectedEvmAddress.slice(0, 6)}…{injectedEvmAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={() => void connectEvm()}
                disabled={evmConnecting || !evmAvailable}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#0070F3] bg-white text-sm font-medium text-[#0070F3] hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {evmConnecting ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#0070F3]/30 border-t-[#0070F3] rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/>
                  </svg>
                )}
                {evmAvailable
                  ? evmConnecting ? 'Connecting…' : 'Connect EVM Wallet'
                  : 'No EVM Wallet Detected'}
              </button>
            )}
          </div>
        )}

        {/* Account connectors */}
        {needsConnectors && status !== 'done' && (
          <div className="pt-2">
            <ConnectorSelector accounts={connectedAccounts} onChange={onAccountsChange} />
          </div>
        )}

        {/* Issuing spinner */}
        {status === 'issuing' && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="w-4 h-4 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm text-blue-700 font-medium">Issuing credential on Midnight Network…</p>
          </div>
        )}

        {/* Success */}
        {status === 'done' && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-3.5">
            <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Attestation issued!</p>
              <p className="text-xs text-green-600 mt-0.5">Your Schnorr attestation is ready for use in ZK circuit calls.</p>
              {txHash && (
                <a
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline mt-0.5 block"
                >
                </a>
              )}
            </div>
          </div>
        )}

        {/* Requirements failure */}
        {status === 'error' && results && results.some(r => !r.passed) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
            <p className="text-sm font-semibold text-red-700">Requirements not met.</p>
            <p className="text-xs text-red-500 mt-0.5">Check the items above and connect the required accounts.</p>
          </div>
        )}

        {error && status === 'error' && !(results && results.some(r => !r.passed)) && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className={`px-4 py-4 border-t border-gray-100 ${status === 'done' ? 'bg-[#f0fdf4]' : 'bg-white'}`}>
        {!isConnected ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-center">
            Connect your Midnight wallet to get a credential.
          </p>
        ) : status !== 'done' ? (
          <button
            onClick={() => void handleVerifyAndIssue()}
            disabled={verifying || status === 'issuing' || evmWalletNeeded}
            className="w-full py-3 bg-[#0070F3] hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(verifying || status === 'issuing') && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {status === 'issuing'
              ? 'Waiting for wallet…'
              : verifying
              ? 'Verifying…'
              : evmWalletNeeded
              ? 'Connect EVM Wallet First'
              : isFreeOnly
              ? 'Get Free Credential'
              : 'Verify & Get Credential'}
          </button>
        ) : (
          <p className="text-sm text-center text-green-700 font-medium">
            ✓ Attestation active
          </p>
        )}
      </div>

      {/* Info footer */}
      <div className="bg-[#0070F3] text-white px-5 py-3.5 text-sm font-medium">
        {isFreeOnly
          ? 'Open to everyone — your wallet submits the credential on Midnight Network.'
          : 'Verifier checks eligibility and issues Schnorr attestation on Midnight automatically.'}
      </div>
    </div>
  )
}

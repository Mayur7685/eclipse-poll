// AdminSetup — deploy the master contract via 1AM wallet.

import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { deployEclipsePollContract, getStoredMasterContractAddress, setStoredMasterContractAddress } from '../lib/eclipse'

const ENV_CONTRACT = import.meta.env.VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS as string | undefined

export default function AdminSetup() {
  const { session, isConnected, address, connect } = useWallet()

  // ── Step 1: Deploy ────────────────────────────────────────────────────────
  const storedAddress = getStoredMasterContractAddress()
  const [contractAddress, setContractAddress] = useState<string | null>(ENV_CONTRACT || storedAddress)
  const [deployTxHash, setDeployTxHash]       = useState<string | null>(null)
  const [showRedeploy, setShowRedeploy] = useState(false)
  const [deploying, setDeploying]     = useState(false)
  const [deployProgress, setDeployProgress] = useState('')
  const [deployStatus, setDeployStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [deployError, setDeployError] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  function copyAddress() {
    if (!contractAddress) return
    navigator.clipboard.writeText(contractAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDeploy() {
    if (!session) return
    setDeploying(true)
    setDeployError(null)
    setDeployProgress('Initializing ZK proof (30-120s)...')
    try {
      const result = await deployEclipsePollContract(session)
      const addr = result.deployTx.contractAddress
      const txHash = (result.deployTx as any).txHash
      setContractAddress(addr)
      setStoredMasterContractAddress(addr)
      setDeployTxHash(txHash ?? addr)
      setDeployStatus('done')
    } catch (e: any) {
      console.error('[AdminSetup] deploy failed:', e)
      setDeployError(e.message ?? String(e))
      setDeployStatus('error')
    } finally {
      setDeploying(false)
      setDeployProgress('')
    }
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-10 space-y-6">

      {/* ── Step 1: Deploy ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            Step 1 — Deploy Master Contract
          </span>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Deploys the Eclipse Poll master contract to Midnight preprod using your 1AM wallet.
            Only needs to be done once.
          </p>
        </div>

        {contractAddress && !showRedeploy ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-800">✓ Contract deployed</p>

            {/* Contract address — truncated with copy button */}
            <div className="flex items-center gap-2 bg-white border border-emerald-100 rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-gray-600 truncate flex-1 min-w-0">
                {contractAddress}
              </span>
              <button
                onClick={copyAddress}
                className="shrink-0 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                title="Copy address"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Env var hint — compact, no full address */}
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠ Already set in <code className="bg-white px-1 rounded font-mono">frontend/.env</code> as{' '}
              <code className="font-mono">VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS</code>
            </p>

            {/* Redeploy option */}
            <button
              onClick={() => {
                localStorage.removeItem('midnight:master_contract_v3');
                localStorage.removeItem('eclipse:userSecretKey:v1');
                setShowRedeploy(true);
                setDeployStatus('idle');
                setDeployError(null);
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
            >
              Redeploy with current wallet (clears existing contract)
            </button>
          </div>
        ) : !isConnected && (contractAddress === null || showRedeploy) ? (
          <button onClick={() => void connect()}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
            Connect 1AM Wallet First
          </button>
        ) : deployStatus === 'done' ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-800">✓ Contract deployed</p>
            <div className="flex items-center gap-2 bg-white border border-emerald-100 rounded-lg px-3 py-2">
              <span className="text-xs font-mono text-gray-600 truncate flex-1 min-w-0">{contractAddress}</span>
              <button onClick={copyAddress} className="shrink-0 text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            {deployTxHash && deployTxHash !== contractAddress && (
              <a href={`https://explorer.1am.xyz/tx/${deployTxHash}?network=preprod`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-emerald-700 hover:underline block">
                View deploy transaction ↗
              </a>
            )}
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠ Already set in <code className="bg-white px-1 rounded font-mono">frontend/.env</code>
            </p>
          </div>
        ) : !isConnected && (contractAddress === null || showRedeploy) ? (
          <button onClick={() => void connect()}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
            Connect 1AM Wallet First
          </button>
        ) : deployStatus === 'error' ? (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 break-words">
              {deployError}
            </div>
            <button onClick={() => void handleDeploy()} disabled={deploying}
              className="w-full py-3 bg-[#0070F3] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-60">
              Retry Deploy
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button onClick={() => void handleDeploy()} disabled={deploying}
              className="w-full py-3 bg-[#0070F3] hover:bg-blue-600 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {deploying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {deploying ? (deployProgress || 'Deploying...') : 'Deploy Master Contract'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Your 1AM wallet will prompt you to sign. ZK proof takes ~30-120s.
            </p>
          </div>
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          <span className="font-semibold">
            {isConnected ? `${address?.slice(0, 20)}…` : 'Wallet not connected'}
          </span>
          {!isConnected && (
            <button onClick={() => void connect()}
              className="ml-auto text-xs text-[#0070F3] hover:underline font-medium">
              Connect →
            </button>
          )}
        </div>
        <p>Attestation API: <span className="font-mono">{import.meta.env.VITE_VERIFIER_URL ?? 'http://localhost:4000'}</span></p>
        {contractAddress && (
          <p className="truncate">Contract: <span className="font-mono">{contractAddress.slice(0, 24)}…</span></p>
        )}
      </div>

    </div>
  )
}

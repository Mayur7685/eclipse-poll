import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { callCircuitOnMasterContract, PollType, CredentialType } from '../lib/eclipse';
import { fromHex } from '../lib/midnight';
import { pollIdFromTitle } from '../lib/utils';
import { pinPollMetadata } from '../lib/pinata';
import { listCommunities, confirmPoll } from '../lib/verifier';
import type { CommunityConfig } from '../types';

const inputCls =
  'block w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all';
const labelCls =
  'block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide';

const STEP_LABELS = ['Poll Setup', 'Options', 'Deploy'];

function WizardStepper({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full mb-8">
      {STEP_LABELS.map((label, i) => {
        const done = i < step - 1;
        const active = i === step - 1;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ring-4 ring-white z-10 ${
                done ? 'bg-[#10B981] text-white' : ''
              } ${active ? 'bg-[#0070F3] text-white shadow-sm' : ''} ${
                !done && !active ? 'bg-white border-2 border-gray-200 text-gray-400' : ''
              }`}
            >
              {done ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-[2px] -mx-1 ${i < step - 1 ? 'bg-[#10B981]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreatePollWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, isConnected, address, connect } = useWallet();

  const [step, setStep] = useState(1);
  const [communities, setCommunities] = useState<CommunityConfig[]>([]);
  const [communityId, setCommunityId] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityConfig | null>(null);
  const [notCreator, setNotCreator] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>(PollType.SIMPLE);
  const [credType, setCredType] = useState<CredentialType>(CredentialType.FREE);
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);

  const [durationMode, setDurationMode] = useState<'blocks' | 'days'>('blocks');
  const [durationBlocks, setDurationBlocks] = useState<number>(1000);
  const [durationDays, setDurationDays] = useState<number>(7);

  const [status, setStatus] = useState<'idle' | 'deploying' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');

  useEffect(() => {
    listCommunities().then(setCommunities).catch(() => null);
  }, []);

  useEffect(() => {
    const preselect = searchParams.get('community');
    if (preselect && communities.length > 0 && !communityId) {
      const c = communities.find(c => c.community_id === preselect);
      if (c) {
        setCommunityId(preselect);
        setSelectedCommunity(c);
        setNotCreator(!!(c.creator_only && c.creator && address && c.creator.toLowerCase() !== address.toLowerCase()));
      }
    }
  }, [communities, searchParams, address, communityId]);

  const addOption = () => {
    if (options.length < 8) setOptions([...options, `Option ${options.length + 1}`]);
  };

  const updateOption = (index: number, val: string) => {
    const next = [...options];
    next[index] = val;
    setOptions(next);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const [deployProgress, setDeployProgress] = useState('');

  const handleDeploy = async () => {
    if (!session || !isConnected) {
      await connect();
      return;
    }

    setStatus('deploying');
    setErrorMessage('');
    setDeployProgress('Initializing circuit call...');

    try {
      const pollIdHex = pollIdFromTitle(title);
      const pollIdBytes = fromHex(pollIdHex.replace(/^0x/, '').padStart(64, '0'));

      // endTime is Unix timestamp in seconds — matches contract's Uint<64> endTime field.
      // Eclipse Poll polls expire by wall-clock time, not block number.
      const nowSec = Math.floor(Date.now() / 1000);
      const endTimeSec = durationMode === 'blocks'
        ? nowSec + durationBlocks * 6        // ~6s per block on Midnight preprod
        : nowSec + durationDays * 24 * 60 * 60;

      const { txHash, contractAddress } = await callCircuitOnMasterContract(
        session,
        'createPoll',
        [pollIdBytes, pollType, credType, BigInt(options.length), BigInt(endTimeSec)],
        (msg) => setDeployProgress(msg)
      );

      const pollConfig = {
        poll_id: pollIdHex,
        community_id: communityId,
        title,
        description,
        poll_type: pollType === PollType.HIERARCHICAL ? 'hierarchical' : pollType === PollType.RANKED_CHOICE ? 'flat' : 'simple',
        cred_type: credType,
        options,
        creator: address || session.unshieldedAddress,
        created_at: Date.now(),
        created_at_block: nowSec,
        end_time: endTimeSec * 1000,   // store as ms for display
        end_block: endTimeSec,          // Unix seconds — used by PollCard deadline display
        contract_address: contractAddress,
      };

      const cid = await pinPollMetadata(pollConfig);
      await confirmPoll({ ...pollConfig, ipfs_cid: cid });

      setDeployedAddress(txHash || contractAddress);
      setStatus('done');
    } catch (err: any) {
      console.error('Contract deployment failed:', err);
      setErrorMessage(err.message || 'Failed to deploy contract on Midnight');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
        <WizardStepper step={step} />

        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Community Poll</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deploy a privacy-preserving DAO poll contract on Midnight Network
          </p>
        </div>

        {status === 'done' ? (
          <div className="space-y-4 text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-gray-900">Poll Created!</h2>
            <p className="text-sm text-gray-500">
              Your poll is live on Midnight Network. Votes are ZK-private.
            </p>
            {deployedAddress && (
              <a
                href={deployedAddress.length === 64
                  ? `https://explorer.1am.xyz/tx/${deployedAddress}?network=preprod`
                  : `https://explorer.1am.xyz/contract/${import.meta.env.VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS}?network=preprod`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#0070F3] hover:underline"
              >
                View tx on 1AM Explorer ↗
              </a>
            )}
            <button
              onClick={() => navigate('/polls')}
              className="w-full py-3 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition-colors mt-2"
            >
              Go to Poll Feed
            </button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Select Target Community / DAO *</label>
              <select
                className={inputCls}
                value={communityId}
                onChange={e => {
                  const id = e.target.value;
                  setCommunityId(id);
                  const c = communities.find(c => c.community_id === id) ?? null;
                  setSelectedCommunity(c);
                  setNotCreator(!!(c?.creator_only && c?.creator && address && c.creator.toLowerCase() !== address.toLowerCase()));
                }}
              >
                <option value="">Select a Community / DAO...</option>
                {communities.map(c => (
                  <option key={c.community_id} value={c.community_id}>
                    {c.name} {c.creator_only ? '(Creator Only)' : '(Open Mode)'}
                  </option>
                ))}
              </select>

              {notCreator && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  <svg className="w-3.5 h-3.5 inline mr-1 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> This community policy restricts poll creation to the community creator only.
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Poll Title *</label>
              <input
                type="text"
                placeholder="e.g. Governance Upgrade Proposal #4"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                rows={3}
                placeholder="Describe the context and goals of this proposal..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Poll Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPollType(PollType.SIMPLE)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    pollType === PollType.SIMPLE
                      ? 'border-[#0070F3] bg-blue-50/50 text-[#0070F3] shadow-sm'
                      : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  <p className="text-sm font-bold flex items-center gap-1.5"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg> Single Choice</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Voters select a single option via radio buttons (Yes/No or Multiple Options).
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPollType(PollType.RANKED_CHOICE)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    pollType === PollType.RANKED_CHOICE
                      ? 'border-[#0070F3] bg-blue-50/50 text-[#0070F3] shadow-sm'
                      : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  <p className="text-sm font-bold flex items-center gap-1.5"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Ranked Choice</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Voters rank multiple options in order of preference (1st, 2nd, 3rd choice).
                  </p>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls}>Poll Duration</label>
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDurationMode('blocks')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      durationMode === 'blocks'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📦 Blocks
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationMode('days')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      durationMode === 'days'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📅 Days
                  </button>
                </div>
              </div>

              {durationMode === 'blocks' ? (
                <div className="space-y-2">
                  <select
                    value={durationBlocks}
                    onChange={e => setDurationBlocks(Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value={100}>100 Blocks (~10 Minutes)</option>
                    <option value={500}>500 Blocks (~50 Minutes)</option>
                    <option value={1000}>1,000 Blocks (~2.7 Hours)</option>
                    <option value={5000}>5,000 Blocks (~13.8 Hours)</option>
                    <option value={10000}>10,000 Blocks (~1.1 Days)</option>
                    <option value={50000}>50,000 Blocks (~5.7 Days)</option>
                  </select>
                  <p className="text-[11px] text-gray-400">
                    Target block height will be set to <code className="text-gray-600 bg-gray-50 px-1 py-0.5 rounded border border-gray-100">+ {durationBlocks.toLocaleString()} blocks</code> from current head.
                  </p>
                </div>
              ) : (
                <select
                  value={durationDays}
                  onChange={e => setDurationDays(Number(e.target.value))}
                  className={inputCls}
                >
                  <option value={1}>1 Day (24 Hours)</option>
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days (1 Week)</option>
                  <option value={14}>14 Days (2 Weeks)</option>
                  <option value={30}>30 Days (1 Month)</option>
                </select>
              )}
            </div>

            {/* Credential gate selector hidden — all polls open (coming soon) */}
            {false && (
            <div>
              <label className={labelCls}>Credential Gate</label>
              <select
                value={credType}
                onChange={e => setCredType(Number(e.target.value) as CredentialType)}
                className={inputCls}
              >
                <option value={CredentialType.FREE}>Open to All Members (Free)</option>
                <option value={CredentialType.ALLOWLIST}>Allowlist (Jubjub Schnorr)</option>
                <option value={CredentialType.SOCIAL_OAUTH}>Social OAuth Attestation</option>
              </select>
            </div>
            )}

            <button
              disabled={!communityId || !title.trim() || notCreator}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Continue to Options →
            </button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Poll Options ({options.length}/8)</label>
              <div className="space-y-2.5 mt-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      className={inputCls}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="px-3 py-2 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 8 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 text-xs font-semibold text-[#0070F3] hover:underline flex items-center gap-1"
                >
                  + Add Option
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 py-3 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition-colors"
              >
                Review & Deploy →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <span className="font-semibold text-gray-800">Community:</span> {selectedCommunity?.name}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Title:</span> {title}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Type:</span>{' '}
                  {pollType === PollType.SIMPLE ? 'Simple Poll' : 'Ranked Choice'}
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Options:</span> {options.join(', ')}
                </p>
              </div>
            </div>

            {status === 'deploying' && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3 text-blue-700 text-xs font-medium">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{deployProgress || 'Waiting for 1AM Wallet signature... Please check your wallet extension!'}</span>
              </div>
            )}

            {errorMessage && <p className="text-xs text-red-500 font-medium">{errorMessage}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={status === 'deploying'}
                onClick={() => setStep(2)}
                className="w-1/3 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={status === 'deploying'}
                onClick={handleDeploy}
                className="w-2/3 py-3 rounded-full bg-[#0070F3] hover:bg-blue-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {status === 'deploying' ? 'Deploying ZK Contract...' : 'Deploy Contract'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

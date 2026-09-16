import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WalletButton from '../components/WalletButton';
import { useWallet } from '../hooks/useWallet';

const AVATAR_COLORS = [
  'bg-blue-50 border-blue-100 text-blue-500',
  'bg-teal-50 border-teal-100 text-teal-600',
  'bg-emerald-50 border-emerald-100 text-emerald-600',
  'bg-purple-50 border-purple-100 text-purple-600',
  'bg-orange-50 border-orange-100 text-orange-600',
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create a community',
    body: 'Define membership rules: Jubjub Schnorr attestation, OAuth, Allowlist, or open to all. Multi-level credential gate support.',
    colour: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    step: '02',
    title: 'Get a credential',
    body: 'Attestation API signs your credential using Jubjub Schnorr signatures. Your 1AM wallet holds private proof for circuit witnesses.',
    colour: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    step: '03',
    title: 'Vote or respond',
    body: 'Rank options, pick one, or answer survey questions. Everything is ZK proven in-browser via Compact smart contracts on Midnight.',
    colour: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    step: '04',
    title: 'Results verified on-chain',
    body: 'Votes increment public counters directly in ledger state without revealing voter identity or choice. 0s delay for instant tallies.',
    colour: 'bg-purple-50 text-purple-600 border-purple-100',
  },
];

export default function LandingPage() {
  const { isConnected } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) navigate('/polls', { replace: true });
  }, [isConnected, navigate]);

  return (
    <div className="bg-white text-gray-900 antialiased min-h-screen flex flex-col selection:bg-blue-100 selection:text-blue-900">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="w-full px-6 py-5 flex justify-between items-center max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-gray-900 leading-none">Eclipse Poll</span>
        </div>
        <WalletButton />
      </header>

      <main className="flex-1 flex flex-col w-full">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="mt-20 sm:mt-28 flex flex-col items-center text-center px-4 w-full max-w-4xl mx-auto">

          <div className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-medium mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_1px_rgba(16,185,129,0.6)]" />
            Midnight Network · Preprod ZK · Live ✓
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.06]">
            <span className="text-[#0070F3]">Private polls</span>
            <br />
            <span className="text-gray-900">& anonymous surveys.</span>
          </h1>

          <p className="mt-7 text-lg text-gray-500 max-w-xl leading-relaxed">
            Community governance and anonymous surveys powered by Midnight Zero-Knowledge contracts. Votes are tallied on-chain with zero data leakage.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <WalletButton />
            <Link to="/polls"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Browse without connecting →
            </Link>
          </div>
        </section>

        {/* ── Privacy guarantee strip ─────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 mt-12 w-full">
          <div className="border border-gray-100 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 bg-gray-50/50">
            {[
              {
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ),
                label: 'Individual votes stay private', sub: 'Zero knowledge proofs',
              },
              {
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ),
                label: 'Schnorr Attestations', sub: 'Proof published on-chain',
              },
              {
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                ),
                label: 'Midnight Network', sub: 'Compact v0.23 contract',
              },
              {
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                ),
                label: 'Zero data leakage', sub: 'No identity ever leaves',
              },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="text-gray-500">{icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{label}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Three product modes ─────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 mt-20 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Polls',
                desc: 'Ranked-choice or single-pick. ZK-proven ballots accumulate on-chain. Only public aggregate counters are updated.',
                cta: '/create-poll',
                ctaLabel: 'Create Poll',
                border: 'border-blue-100 hover:border-blue-200',
                badge: 'bg-blue-50 text-blue-600',
              },
              {
                title: 'Surveys',
                desc: 'Multi-question anonymous forms. Answers proven with private witness state. Individual choices stay encrypted.',
                cta: '/create-survey',
                ctaLabel: 'Create Survey',
                border: 'border-purple-100 hover:border-purple-200',
                badge: 'bg-purple-50 text-purple-600',
              },
              {
                title: 'Communities',
                desc: 'Gate participation with Jubjub Schnorr credentials: OAuth, Allowlist, or open access.',
                cta: '/create',
                ctaLabel: 'New Community',
                border: 'border-emerald-100 hover:border-emerald-200',
                badge: 'bg-emerald-50 text-emerald-600',
              },
            ].map(({ title, desc, cta, ctaLabel, border, badge }) => (
              <div key={title} className={`bg-white border rounded-2xl p-5 flex flex-col justify-between min-h-[200px] transition-all ${border}`}>
                <div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge}`}>{title}</span>
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{desc}</p>
                </div>
                <Link to={cta} className="mt-4 text-xs font-medium text-[#0070F3] hover:underline">
                  {ctaLabel} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 mt-24 w-full mb-24">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">How Midnight Eclipse Poll Works</h2>
            <p className="text-sm text-gray-500 mt-2">Private voting powered by Midnight Compact smart contracts</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="bg-white border border-gray-100 rounded-2xl p-6 relative">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${item.colour} inline-block mb-3`}>
                  STEP {item.step}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <footer className="w-full border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        Eclipse Poll on Midnight Network · Preprod ZK Contract
      </footer>
    </div>
  );
}

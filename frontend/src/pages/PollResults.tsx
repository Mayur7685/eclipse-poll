import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { fetchContractLedger } from '../lib/eclipse';
import { getCommunityById } from '../lib/verifier';
import { fromHex } from '../lib/midnight';

interface TallyEntry {
  optionId: number;
  label: string;
  count: bigint;
}

function TallyTree({ entries, maxCount }: { entries: TallyEntry[]; maxCount: number }) {
  const sorted = [...entries].sort((a, b) => Number(b.count - a.count));
  const colors = ['#10B981', '#0070F3', '#6366f1', '#f59e0b', '#9ca3af'];
  const hasAnyVotes = maxCount > 0;

  return (
    <div className="space-y-3">
      {sorted.map((entry, idx) => {
        const pct = hasAnyVotes ? (Number(entry.count) / maxCount) * 100 : 0;
        const color = colors[Math.min(idx, colors.length - 1)];
        return (
          <div key={entry.optionId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white"
                  style={{ background: color }}
                >
                  {idx + 1}
                </span>
                <span className="font-medium text-gray-900">{entry.label}</span>
              </div>
              {hasAnyVotes && (
                <span className="text-xs text-gray-400 font-mono tabular-nums">
                  {pct.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-8">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PollResults() {
  const { communityId, pollId } = useParams<{ communityId: string; pollId: string }>();
  const { session } = useWallet();
  const [tallies, setTallies] = useState<TallyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollTitle, setPollTitle] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [optionCount, setOptionCount] = useState(0);
  const [pollStatus, setPollStatus] = useState<'active' | 'closed' | 'expired'>('active');
  const [endTime, setEndTime] = useState<number | null>(null);

  const MASTER_CONTRACT = import.meta.env.VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS as string | undefined;

  useEffect(() => {
    if (!pollId || !communityId) return;
    setLoading(true);

    Promise.all([
      getCommunityById(communityId),
      (session && MASTER_CONTRACT)
        ? fetchContractLedger(session, MASTER_CONTRACT).catch(() => null)
        : Promise.resolve(null),
    ]).then(([comm, ledger]) => {
      const backendPoll = comm?.polls?.find(p => p.poll_id === pollId);
      setPollTitle(backendPoll?.title ?? '');
      setCommunityName(comm?.name ?? '');
      const opts = backendPoll?.options ?? [];
      setOptionCount(opts.length);

      // Determine poll status
      const et = backendPoll?.end_time ?? backendPoll?.end_block ?? null;
      if (et) setEndTime(et);
      const pollIdBytes = fromHex(pollId.replace(/^0x/, '').padStart(64, '0'));

      if (ledger?.polls) {
        try {
          if (ledger.polls.member(pollIdBytes)) {
            const cfg = ledger.polls.lookup(pollIdBytes);
            if (cfg?.isClosed) setPollStatus('closed');
            else if (et && et < Date.now()) setPollStatus('expired');
            else setPollStatus('active');
          }
        } catch { /* ignore */ }
      } else if (et && et < Date.now()) {
        setPollStatus('expired');
      }

      // Read tallies from ledger
      const list: TallyEntry[] = opts.map((opt: any, idx: number) => {
        const label = typeof opt === 'string' ? opt : opt.label ?? `Option ${idx + 1}`;
        let count = 0n;

        if (ledger?.tallies) {
          try {
            if (ledger.tallies.member(pollIdBytes)) {
              const optMap = ledger.tallies.lookup(pollIdBytes);
              if (optMap && optMap.member(BigInt(idx))) {
                const counter = optMap.lookup(BigInt(idx));
                const val = typeof counter?.read === 'function' ? counter.read() : counter;
                count = typeof val === 'bigint' ? val : BigInt(String(val ?? 0));
              }
            }
          } catch (e) {
            console.warn('[PollResults] tally lookup error:', e);
          }
        }

        return { optionId: idx, label, count };
      });

      setTallies(list);
    }).finally(() => setLoading(false));
  }, [pollId, communityId, session, MASTER_CONTRACT]);

  const totalVotes = tallies.reduce((sum, t) => sum + Number(t.count), 0);
  const title = pollTitle || `Poll ${pollId?.slice(0, 10)}…`;
  const isFinished = pollStatus === 'closed' || pollStatus === 'expired';

  const statusBadge = () => {
    if (pollStatus === 'closed') return { text: 'Voting Closed', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
    if (pollStatus === 'expired') return { text: 'Poll Ended', cls: 'bg-amber-50 text-amber-600 border-amber-100' };
    return { text: 'Voting Open', cls: 'bg-blue-50 text-blue-600 border-blue-100' };
  };
  const badge = statusBadge();

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-8">
      <Link
        to={`/communities/${communityId}/polls/${pollId}`}
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors group"
      >
        <svg className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Poll
      </Link>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading results…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Poll header */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {communityName} · {optionCount} option{optionCount !== 1 ? 's' : ''}
                  {endTime && pollStatus === 'active' && endTime > Date.now() && (
                    <span className="ml-2 text-blue-500">
                      · Ends {new Date(endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.cls}`}>
                {badge.text}
              </span>
            </div>
          </div>

          {/* Results or Ongoing */}
          {isFinished ? (
            // ── Poll finished — show tally ─────────────────────────────────
            <div className="border-[1.5px] border-[#0070F3] rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">On-Chain Tally</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  ZK-proven vote counts · aggregate only
                </p>
              </div>
              <div className="p-5">
                <TallyTree entries={tallies} maxCount={totalVotes} />
                {totalVotes === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm font-medium text-gray-600">No votes were cast.</p>
                    <p className="text-xs text-gray-400 mt-1">This poll closed without any votes.</p>
                  </div>
                )}
              </div>
              <div className="bg-[#0070F3] text-white px-5 py-3.5 text-sm font-medium">
                ZK proofs on Midnight Network. Individual votes were never revealed.
              </div>
            </div>
          ) : (
            // ── Poll ongoing — hide results ────────────────────────────────
            <div className="border-[1.5px] border-[#0070F3] rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="p-6 text-center">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[#0070F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900">Voting in Progress</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Results are hidden while voting is open to prevent influencing voters.
                  Tallies will be revealed when the poll closes.
                </p>
                {/* Show options so voters know what they're choosing */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {tallies.map((t, i) => (
                    <span key={t.optionId}
                      className="text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100 px-3 py-1.5 rounded-lg">
                      {i + 1}. {t.label}
                    </span>
                  ))}
                </div>
                <Link
                  to={`/communities/${communityId}/polls/${pollId}`}
                  className="inline-block mt-4 text-xs font-semibold bg-[#0070F3] text-white px-5 py-2 rounded-full hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Cast Your Vote →
                </Link>
              </div>
              <div className="bg-[#0070F3] text-white px-5 py-3.5 text-sm font-medium text-center">
                ZK proofs on Midnight Network. Individual votes are never revealed.
              </div>
            </div>
          )}

          {!session && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-700">Connect your wallet to load live tallies from the Midnight ledger.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

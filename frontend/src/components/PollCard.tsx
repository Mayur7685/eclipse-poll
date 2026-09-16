import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { nowSeconds, hasVotedOn } from '../lib/utils';
import { useWallet } from '../hooks/useWallet';
import type { PollInfo } from '../types';

interface Props {
  communityId: string;
  communityName: string;
  poll: PollInfo;
}

/**
 * Compute deadline display info from Unix timestamp seconds (end_block stores Unix time).
 * Eclipse Poll uses Unix seconds, not Ethereum block numbers.
 */
function getDeadlineInfo(endTime: number, currentTime: number) {
  if (currentTime === 0) return { text: 'Active', cls: 'text-gray-400 bg-gray-50 border-gray-100', closed: false, closingSoon: false };

  const secsLeft = endTime - currentTime;
  if (secsLeft <= 0) {
    return { text: 'Closed', cls: 'text-gray-400 bg-gray-50 border-gray-100', closed: true, closingSoon: false };
  }

  const closingSoon = secsLeft < 86_400;

  const d = Math.floor(secsLeft / 86_400);
  const h = Math.floor((secsLeft % 86_400) / 3_600);
  const m = Math.floor((secsLeft % 3_600) / 60);
  const text = d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;

  const cls = secsLeft < 3_600 ? 'text-red-500 bg-red-50 border-red-100'
    : secsLeft < 86_400 ? 'text-amber-600 bg-amber-50 border-amber-100'
    : 'text-gray-500 bg-gray-50 border-gray-100';

  return { text, cls, closed: false, closingSoon };
}

export default function PollCard({ communityId, communityName, poll }: Props) {
  const [currentTime, setCurrentTime] = useState(nowSeconds());
  const { address } = useWallet();

  const [voted, setVoted] = useState(false);

  useEffect(() => {
    if (!address) return;
    const pollIdHex = poll.poll_id.replace(/^0x/, '');
    const didVote = hasVotedOn(pollIdHex, address);
    setVoted(didVote);

    if (didVote) {
      const subKey = `zkpoll:submission:${address.toLowerCase()}:${pollIdHex}`;
      try {
        const raw = localStorage.getItem(subKey);
        const sub = raw ? JSON.parse(raw) : null;
        if (sub?.selectedOption != null && poll.options?.[sub.selectedOption]) {
          const opt = poll.options[sub.selectedOption];
          setMyChoiceLabel(typeof opt === 'string' ? opt : (opt as any).label ?? null);
        }
      } catch { /* ignore */ }
    }
  }, [address, poll.poll_id, poll.options]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(nowSeconds()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Normalise options — can be plain strings or objects with label/option_id
  const allOptions: { option_id: number; label: string; parent_option_id: number }[] =
    (poll.options ?? []).map((o: any, idx: number) =>
      typeof o === 'string'
        ? { option_id: idx + 1, label: o, parent_option_id: 0 }
        : { option_id: o.option_id ?? idx + 1, label: o.label ?? String(o), parent_option_id: o.parent_option_id ?? 0 }
    );
  const rootOptions = allOptions.filter(o => o.parent_option_id === 0);
  const deadline = poll.end_block ? getDeadlineInfo(poll.end_block, currentTime) : null;

  return (
    <Link
      to={poll.poll_type === 'survey'
        ? `/communities/${communityId}/surveys/${poll.poll_id}`
        : `/communities/${communityId}/polls/${poll.poll_id}`}
      className="border border-gray-100 bg-white rounded-[1.25rem] p-5 hover:border-gray-200 hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)] transition-all group flex flex-col justify-between min-h-[160px] block"
    >
      <div className="pt-1">
        <div className="flex justify-between items-start gap-3">
          <h3 className="text-base font-medium text-gray-900 leading-snug">{poll.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {deadline?.closingSoon && !deadline.closed && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            {deadline?.text && (
              <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${deadline.cls}`}>
                {deadline.text}
              </span>
            )}
            {deadline?.closed && (
              <span className="text-xs font-medium border px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50 border-emerald-100">
                Results ready
              </span>
            )}
          </div>
        </div>

        {poll.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{poll.description}</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {/* Options pills */}
        <div className="flex flex-wrap gap-1.5">
          {rootOptions.slice(0, 3).map(opt => (
            <span key={opt.option_id} className="text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100 px-2.5 py-1 rounded-lg truncate max-w-[160px]">
              {opt.label}
            </span>
          ))}
          {rootOptions.length > 3 && (
            <span className="text-xs font-medium text-gray-400 py-1">+{rootOptions.length - 3}</span>
          )}
        </div>

        {/* Bottom row: voted badge left, community right */}
        <div className="flex items-center justify-between">
          <div>
            {voted && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                You voted
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            {deadline?.closed && (
              <Link
                to={`/communities/${communityId}/polls/${poll.poll_id}/results`}
                onClick={e => e.stopPropagation()}
                className="text-xs text-[#0070F3] hover:underline font-medium"
              >
                See results →
              </Link>
            )}
            <span>{communityName}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

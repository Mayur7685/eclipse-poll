import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import type { QuestInfo, QuestProgress } from '../types';

export function useQuests(communityId = '') {
  const { address } = useWallet();
  const [quests, setQuests] = useState<QuestInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      setQuests([]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { quests, loading, error, fetchQuests };
}

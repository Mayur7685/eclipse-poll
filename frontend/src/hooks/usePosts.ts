import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import type { PostMetadata } from '../types';

export function usePosts(communityId = '') {
  const { address } = useWallet();
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      setPosts([]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(
    async (title: string, body: string) => {
      if (!address) throw new Error('Wallet not connected');
      // Midnight post creation logic
    },
    [address],
  );

  return { posts, loading, error, fetchPosts, createPost };
}

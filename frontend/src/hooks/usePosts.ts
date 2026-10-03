import { useState, useCallback, useEffect } from 'react';
import { useWallet } from './useWallet';
import type { PostMetadata } from '../types';

const BASE = import.meta.env.VITE_VERIFIER_URL ?? 'http://localhost:4000';

export function usePosts(communityId = '') {
  const { address } = useWallet();
  const [posts, setPosts]   = useState<PostMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/communities/${communityId}/posts`);
      if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
      const data = await res.json() as PostMetadata[];
      setPosts(data);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  const createPost = useCallback(
    async (title: string, body: string, imageUrl?: string): Promise<PostMetadata | null> => {
      if (!address) throw new Error('Wallet not connected');
      if (!title.trim() || !body.trim()) throw new Error('Title and body required');
      const res = await fetch(`${BASE}/communities/${communityId}/posts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body, author: address, image_url: imageUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? 'Failed to create post');
      }
      const post = await res.json() as PostMetadata;
      setPosts(prev => [post, ...prev]);
      return post;
    },
    [address, communityId],
  );

  const deletePost = useCallback(
    async (postId: string): Promise<void> => {
      const res = await fetch(`${BASE}/communities/${communityId}/posts/${postId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete post');
      setPosts(prev => prev.filter(p => p.id !== postId));
    },
    [communityId],
  );

  useEffect(() => { void fetchPosts(); }, [fetchPosts]);

  return { posts, loading, error, fetchPosts, createPost, deletePost };
}

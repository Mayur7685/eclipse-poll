// useVoteHistory — reads vote records for the connected wallet.
//
// Architecture:
//   PRIMARY:  Server encrypted submissions (survives localStorage clear, works cross-device)
//   FALLBACK: localStorage nullifier markers (if server unavailable)
//
// The server stores AES-GCM encrypted vote data keyed by wallet address.
// Only the user can decrypt (key derived from userSecretKey in localStorage).
// Server never sees plaintext — privacy preserved.

import { useState, useCallback, useEffect } from 'react'
import { useWallet } from './useWallet'
import { getDerivedKey, decryptJSON } from '../lib/submissionCrypto'

export interface VoteCastEvent {
  pollId:          string
  voter:           string
  blockNumber:     bigint
  votedAt?:        number
  selectedOption?: number | null
  ranking?:        Record<string, number>
  poll_type?:      string
}

const VERIFIER = import.meta.env.VITE_VERIFIER_URL ?? 'http://localhost:4000'

export function useVoteHistory() {
  const { address, isConnected } = useWallet()
  const [events, setEvents]   = useState<VoteCastEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isConnected || !address) { setEvents([]); return }
    setLoading(true)
    setError(null)

    try {
      const eventsMap = new Map<string, VoteCastEvent>()

      // ── PRIMARY: Server encrypted submissions ─────────────────────────────
      // This is the production source of truth — works across devices and
      // survives localStorage clears as long as userSecretKey exists.
      let serverLoaded = false
      try {
        const res = await fetch(`${VERIFIER}/submissions/${address}`)
        if (res.ok) {
          const serverSubs = await res.json() as Array<{ pollId: string; ciphertext: string; savedAt?: number }>
          if (serverSubs.length > 0) {
            const encKey = await getDerivedKey()
            for (const sub of serverSubs) {
              try {
                const plain = await decryptJSON(sub.ciphertext, encKey) as Record<string, unknown>
                // Normalize pollId — strip 0x prefix for consistent keying
                const pollId = (plain.pollId as string ?? sub.pollId).replace(/^0x/, '')
                eventsMap.set(pollId, {
                  pollId,
                  voter:          address,
                  blockNumber:    0n,
                  votedAt:        (plain.votedAt as number) ?? sub.savedAt,
                  selectedOption: (plain.selectedOption as number) ?? null,
                  ranking:        (plain.ranking as Record<string, number>) ?? undefined,
                  poll_type:      (plain.poll_type as string) ?? undefined,
                })
              } catch {
                // Decryption failed — userSecretKey mismatch (different device/browser)
                // Still add as unknown vote so the user knows they voted
                const pollId = sub.pollId.replace(/^0x/, '')
                if (!eventsMap.has(pollId)) {
                  eventsMap.set(pollId, { pollId, voter: address, blockNumber: 0n, votedAt: sub.savedAt })
                }
              }
            }
            serverLoaded = true
          }
        }
      } catch {
        // Server unavailable — fall through to localStorage fallback
      }

      // ── FALLBACK: localStorage nullifier markers ───────────────────────────
      // Used when server is unavailable (e.g. Render free tier cold start).
      // Also merges any local votes not yet synced to server.
      const votedPrefix = `zkpoll:voted:${address.toLowerCase()}:`
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key?.startsWith(votedPrefix)) continue
        const pollId = key.slice(votedPrefix.length).replace(/^0x/, '')
        if (!eventsMap.has(pollId)) {
          // Not on server yet — read local submission
          const subRaw = localStorage.getItem(`zkpoll:submission:${address.toLowerCase()}:${pollId}`)
          let sub: Record<string, unknown> | null = null
          try { if (subRaw) sub = JSON.parse(subRaw) } catch {}
          eventsMap.set(pollId, {
            pollId,
            voter:          address,
            blockNumber:    0n,
            votedAt:        (sub?.votedAt as number) ?? undefined,
            selectedOption: (sub?.selectedOption as number) ?? null,
            poll_type:      (sub?.poll_type as string) ?? undefined,
          })
        }
      }

      // Sort newest first
      const list = Array.from(eventsMap.values())
        .sort((a, b) => (b.votedAt ?? 0) - (a.votedAt ?? 0))

      setEvents(list)

      // Silently sync any localStorage-only votes to server (fire and forget)
      if (serverLoaded) {
        syncLocalToServer(address, list).catch(() => {})
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [isConnected, address])

  useEffect(() => { void load() }, [load])

  return { events, loading, error, refresh: load }
}

// Sync votes that are in localStorage but not yet on the server
async function syncLocalToServer(address: string, serverEvents: VoteCastEvent[]): Promise<void> {
  const { encryptJSON } = await import('../lib/submissionCrypto')
  const serverPollIds = new Set(serverEvents.map(e => e.pollId))
  const votedPrefix = `zkpoll:voted:${address.toLowerCase()}:`

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(votedPrefix)) continue
    const pollId = key.slice(votedPrefix.length).replace(/^0x/, '')
    if (serverPollIds.has(pollId)) continue  // already on server

    const subRaw = localStorage.getItem(`zkpoll:submission:${address.toLowerCase()}:${pollId}`)
    if (!subRaw) continue

    try {
      const sub = JSON.parse(subRaw)
      const ciphertext = await encryptJSON(sub)
      await fetch(`${import.meta.env.VITE_VERIFIER_URL ?? 'http://localhost:4000'}/submissions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, pollId, ciphertext }),
      })
    } catch { /* non-fatal */ }
  }
}

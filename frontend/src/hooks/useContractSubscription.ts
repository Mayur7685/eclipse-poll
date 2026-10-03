// useContractSubscription — subscribes to Midnight Indexer WebSocket for
// real-time contract state updates. Fires a callback whenever the contract
// state changes (new vote = new tally).

import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_MIDNIGHT_INDEXER_WS_URI as string
  ?? 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';

interface UseContractSubscriptionOptions {
  contractAddress: string | null;
  onUpdate: () => void;       // called when state changes
  enabled?: boolean;
}

/**
 * Subscribes to Midnight Indexer WebSocket for contract state changes.
 * Calls onUpdate() whenever a new transaction is confirmed for the contract.
 *
 * Uses graphql-ws protocol over WebSocket.
 */
export function useContractSubscription({
  contractAddress,
  onUpdate,
  enabled = true,
}: UseContractSubscriptionOptions): void {
  const wsRef    = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    if (!contractAddress || !enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL, 'graphql-ws');
      wsRef.current = ws;

      ws.onopen = () => {
        // graphql-ws init handshake
        ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === 'connection_ack') {
            // Subscribe to contract state changes
            ws.send(JSON.stringify({
              id: '1',
              type: 'subscribe',
              payload: {
                query: `subscription ContractWatch($address: HexEncoded!) {
                  contractStateUpdated(address: $address) {
                    address
                    transaction { hash }
                  }
                }`,
                variables: { address: contractAddress },
              },
            }));
          }

          if (msg.type === 'next' && msg.payload?.data?.contractStateUpdated) {
            console.log('[useContractSubscription] New contract state:', msg.payload.data.contractStateUpdated.transaction?.hash?.slice(0, 16));
            // Debounce — don't re-fetch more than once per 2s
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => onUpdateRef.current(), 2000);
          }

          if (msg.type === 'error') {
            console.warn('[useContractSubscription] Subscription error:', msg.payload);
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Reconnect after 5s if still enabled
        if (enabled && contractAddress) {
          timerRef.current = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn('[useContractSubscription] WebSocket not available:', e);
    }
  }, [contractAddress, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}

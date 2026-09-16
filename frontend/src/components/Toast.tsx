// Toast notification system.
// Usage: import { useToast } from './Toast' — call toast.success() / toast.error()
// Wrap app with <ToastProvider> in main.tsx.

import { createContext, useContext, useState, useCallback, useRef } from 'react'

interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
  txId?: string   // links to Midnight preprod explorer
}

interface ToastContextValue {
  success: (message: string, txId?: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error:   () => {},
  info:    () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

/** Link to a tx on 1AM Explorer */
const EXPLORER_TX = (txHash: string) =>
  `https://explorer.1am.xyz/tx/${txHash}?network=preprod`

/** Fallback: link to the master contract page */
const EXPLORER_CONTRACT = () => {
  const addr = import.meta.env.VITE_MIDNIGHT_MASTER_CONTRACT_ADDRESS as string
  return addr ? `https://explorer.1am.xyz/contract/${addr}?network=preprod` : null
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts]   = useState<ToastItem[]>([])
  const counterRef            = useRef(0)

  const push = useCallback((type: ToastItem['type'], message: string, txId?: string) => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, type, message, txId }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const ctx: ToastContextValue = {
    success: (msg, txId) => push('success', msg, txId),
    error:   (msg)       => push('error', msg),
    info:    (msg)       => push('info', msg),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success'
                ? <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                : t.type === 'error'
                ? <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              }
            </span>
            <span className="toast-message">{t.message}</span>
            {t.type === 'success' && (() => {
              const href = t.txId ? EXPLORER_TX(t.txId) : EXPLORER_CONTRACT()
              return href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="toast-link"
                >
                  {t.txId ? 'View tx ↗' : 'View on explorer ↗'}
                </a>
              ) : null
            })()}
            <button
              className="toast-close"
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

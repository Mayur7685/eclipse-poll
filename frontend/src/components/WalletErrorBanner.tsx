import { useWallet } from '../contexts/WalletContext'
import type { WalletErrorType } from '../contexts/WalletContext'

const ICONS: Record<WalletErrorType, JSX.Element> = {
  locked: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
  not_installed: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  rejected: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  network: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 6s4-2 11-2 11 2 11 2"/><path d="M1 12s4-2 11-2 11 2 11 2"/><path d="M5 18s3-1 7-1 7 1 7 1"/><line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  ),
  unknown: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

const ACTION_LABELS: Record<WalletErrorType, string> = {
  locked:        'Try Again',
  not_installed: 'Get 1AM Wallet',
  rejected:      'Try Again',
  network:       'Retry',
  unknown:       'Try Again',
}

export default function WalletErrorBanner() {
  const { walletError, clearError, connect } = useWallet()

  if (!walletError) return null

  const handleAction = async () => {
    if (walletError.type === 'not_installed') {
      window.open('https://chrome.google.com/webstore/detail/1am-wallet/hhddpjpacfjaakjioinajgmhlbhfchao', '_blank')
      return
    }
    clearError()
    await connect()
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="flex items-start gap-3 bg-white border border-red-100 rounded-2xl shadow-lg px-4 py-3.5">
        {/* Icon */}
        <span className="text-red-500 mt-0.5">{ICONS[walletError.type]}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{walletError.message}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{walletError.hint}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <button
            onClick={handleAction}
            className="text-xs font-semibold text-[#0070F3] hover:text-blue-700 transition-colors"
          >
            {ACTION_LABELS[walletError.type]}
          </button>
          <button
            onClick={clearError}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

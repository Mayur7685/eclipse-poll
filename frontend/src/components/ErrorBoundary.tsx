import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError:   boolean
  error:      Error | null
  isZkError:  boolean
  isApiError: boolean
}

function classifyError(err: Error): { isZkError: boolean; isApiError: boolean } {
  const msg = err.message?.toLowerCase() ?? ''
  return {
    isZkError:  msg.includes('proof') || msg.includes('circuit') || msg.includes('wasm') || msg.includes('midnight'),
    isApiError: msg.includes('fetch') || msg.includes('network') || msg.includes('api') || msg.includes('indexer'),
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, isZkError: false, isApiError: false }

  static getDerivedStateFromError(error: Error): State {
    const { isZkError, isApiError } = classifyError(error)
    return { hasError: true, error, isZkError, isApiError }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught error:', error.message, info.componentStack?.slice(0, 200))
  }

  reset = () => this.setState({ hasError: false, error: null, isZkError: false, isApiError: false })

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const { error, isZkError, isApiError } = this.state

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isZkError ? 'ZK Proof Error' : isApiError ? 'Connection Error' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              {isZkError
                ? 'A zero-knowledge proof failed. This may be a temporary issue with the proof server or an expired wallet session.'
                : isApiError
                ? 'Cannot reach the Midnight network or attestation API. Check your connection and try again.'
                : 'An unexpected error occurred. Your votes and data are safe.'}
            </p>
          </div>

          {error?.message && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 font-mono text-left break-words">
              {error.message.slice(0, 200)}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="flex-1 py-2.5 text-sm font-medium bg-[#0070F3] text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Reload Page
            </button>
          </div>

          {isZkError && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Tip: Disconnect and reconnect your 1AM Wallet, then try again.
            </p>
          )}
        </div>
      </div>
    )
  }
}

/** Lightweight inline error boundary for non-critical sections */
export function SectionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          This section failed to load. Try refreshing the page.
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

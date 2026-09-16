// Credentials page — Coming Soon
// Community gating via X, Discord, GitHub, NFT ownership etc will be available in a future release.

export default function CredentialsHub() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-3">
        Credential Gating
      </h1>
      <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto mb-8">
        Gate communities and polls by X / Twitter follows, Discord membership,
        GitHub activity, NFT ownership, and ERC-20 token balance.
        <br /><br />
        This feature is coming in a future release. All polls are currently open to everyone.
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {[
          { icon: '/x-icon.svg', label: 'X / Twitter', invert: true },
          { icon: '/Discord-Symbol-Blurple.svg', label: 'Discord', invert: false },
          { icon: '/GitHub_Invertocat_Black.svg', label: 'GitHub', invert: false },
          { icon: '/telegram-icon.svg', label: 'Telegram', invert: false },
        ].map(({ icon, label, invert }) => (
          <div key={label}
            className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl opacity-50">
            <img src={icon} alt={label} className={`w-4 h-4 ${invert ? 'invert' : ''}`} />
            <span className="text-sm text-gray-600 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-xs text-blue-600 font-medium">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        NFT & token balance checks powered by on-chain EVM verification
      </div>
    </div>
  )
}

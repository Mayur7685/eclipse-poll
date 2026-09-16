import { useWallet } from '../hooks/useWallet';

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect, error } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          1AM Wallet
        </span>
        <button
          onClick={disconnect}
          className="text-sm font-medium px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors"
        >
          {shortAddr(address)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={isConnecting}
        onClick={() => connect()}
        className="text-sm font-medium px-4 py-2 rounded-full bg-gray-900 hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}

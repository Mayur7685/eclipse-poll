// EVM wallet connector for Eclipse Poll credential verification.
// Uses window.ethereum (MetaMask / any injected EVM wallet).
// NOT used for voting — voting uses the 1AM Midnight wallet.
// Only used to prove token/NFT ownership for gated communities.

export function isEvmWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).ethereum;
}

export async function getEvmAddress(): Promise<string | null> {
  if (!isEvmWalletAvailable()) return null;
  try {
    const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_accounts' });
    return accounts[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export async function connectEvmWallet(): Promise<string | null> {
  if (!isEvmWalletAvailable()) return null;
  try {
    const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function onEvmAccountsChanged(cb: (address: string | null) => void): () => void {
  if (!isEvmWalletAvailable()) return () => {};
  const handler = (accounts: string[]) => cb(accounts[0]?.toLowerCase() ?? null);
  (window as any).ethereum.on('accountsChanged', handler);
  return () => (window as any).ethereum.removeListener('accountsChanged', handler);
}

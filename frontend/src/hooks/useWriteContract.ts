// Legacy EVM write contract stub — Replaced by Midnight.js callTx
export function useWriteContract() {
  return {
    writeContractAsync: async () => {
      throw new Error('EVM writeContract is disabled. Use Midnight 1AM Wallet.');
    },
  };
}

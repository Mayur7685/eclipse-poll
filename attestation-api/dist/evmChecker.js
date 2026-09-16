// EVM on-chain credential checker for Eclipse Poll attestation API.
// Uses viem to query token balances and NFT ownership on any EVM chain.
// No API key needed — uses public RPC endpoints.
import { createPublicClient, http, isAddress } from 'viem';
import { mainnet, base, arbitrum, optimism, polygon } from 'viem/chains';
const RPC_URLS = {
    1: 'https://cloudflare-eth.com',
    8453: 'https://mainnet.base.org',
    42161: 'https://arb1.arbitrum.io/rpc',
    10: 'https://mainnet.optimism.io',
    137: 'https://polygon-rpc.com',
};
const CHAINS = { 1: mainnet, 8453: base, 42161: arbitrum, 10: optimism, 137: polygon };
function getClient(chainId) {
    const chain = CHAINS[chainId] ?? mainnet;
    const url = RPC_URLS[chainId] ?? RPC_URLS[1];
    return createPublicClient({ chain, transport: http(url, { timeout: 8_000 }) });
}
const ERC20_ABI = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }];
const ERC721_ABI = [
    { name: 'balanceOf', type: 'function', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
    { name: 'ownerOf', type: 'function', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
];
const ERC1155_ABI = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }];
function chainName(chainId) {
    return { 1: 'Ethereum', 8453: 'Base', 42161: 'Arbitrum', 10: 'Optimism', 137: 'Polygon' }[chainId] ?? `Chain ${chainId}`;
}
/** Check ERC-20 token balance */
export async function checkTokenBalance(chainId, tokenAddress, walletAddress, minBalance) {
    if (!isAddress(walletAddress))
        return { passed: false, balance: '0', message: 'Invalid wallet address' };
    if (!isAddress(tokenAddress))
        return { passed: false, balance: '0', message: 'Invalid token address' };
    try {
        const client = getClient(chainId);
        const balance = await client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [walletAddress],
        });
        const passed = balance >= minBalance;
        return {
            passed,
            balance: balance.toString(),
            message: passed
                ? `Balance ${balance.toString()} ≥ required ${minBalance.toString()} on ${chainName(chainId)}`
                : `Insufficient balance: ${balance.toString()} < ${minBalance.toString()} on ${chainName(chainId)}`,
        };
    }
    catch (e) {
        return { passed: false, balance: '0', message: `RPC error: ${e.message?.slice(0, 80)}` };
    }
}
/** Check ERC-721 NFT ownership. If tokenId provided, check specific token; else check any token in collection. */
export async function checkNftOwnership(chainId, contractAddress, walletAddress, tokenId) {
    if (!isAddress(walletAddress))
        return { passed: false, balance: '0', message: 'Invalid wallet address' };
    if (!isAddress(contractAddress))
        return { passed: false, balance: '0', message: 'Invalid contract address' };
    try {
        const client = getClient(chainId);
        if (tokenId !== undefined && tokenId !== '') {
            // Check specific token ownership
            const owner = await client.readContract({
                address: contractAddress,
                abi: ERC721_ABI,
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
            });
            const passed = owner.toLowerCase() === walletAddress.toLowerCase();
            return {
                passed,
                balance: passed ? '1' : '0',
                message: passed
                    ? `Owns token #${tokenId} on ${chainName(chainId)}`
                    : `Does not own token #${tokenId} on ${chainName(chainId)}`,
            };
        }
        else {
            // Check any token in collection
            const balance = await client.readContract({
                address: contractAddress,
                abi: ERC721_ABI,
                functionName: 'balanceOf',
                args: [walletAddress],
            });
            const passed = balance > 0n;
            return {
                passed,
                balance: balance.toString(),
                message: passed
                    ? `Holds ${balance.toString()} NFT(s) from collection on ${chainName(chainId)}`
                    : `Does not hold any NFTs from this collection on ${chainName(chainId)}`,
            };
        }
    }
    catch (e) {
        return { passed: false, balance: '0', message: `RPC error: ${e.message?.slice(0, 80)}` };
    }
}
/** Check ERC-1155 token balance */
export async function checkErc1155Balance(chainId, contractAddress, walletAddress, tokenId, minBalance) {
    if (!isAddress(walletAddress))
        return { passed: false, balance: '0', message: 'Invalid wallet address' };
    if (!isAddress(contractAddress))
        return { passed: false, balance: '0', message: 'Invalid contract address' };
    try {
        const client = getClient(chainId);
        const balance = await client.readContract({
            address: contractAddress,
            abi: ERC1155_ABI,
            functionName: 'balanceOf',
            args: [walletAddress, BigInt(tokenId)],
        });
        const passed = balance >= minBalance;
        return {
            passed,
            balance: balance.toString(),
            message: passed
                ? `ERC-1155 balance ${balance} ≥ required ${minBalance} on ${chainName(chainId)}`
                : `Insufficient ERC-1155 balance: ${balance} < ${minBalance} on ${chainName(chainId)}`,
        };
    }
    catch (e) {
        return { passed: false, balance: '0', message: `RPC error: ${e.message?.slice(0, 80)}` };
    }
}
/** Check native coin balance (ETH, MATIC, etc) */
export async function checkNativeBalance(chainId, walletAddress, minBalance) {
    if (!isAddress(walletAddress))
        return { passed: false, balance: '0', message: 'Invalid wallet address' };
    try {
        const client = getClient(chainId);
        const balance = await client.getBalance({ address: walletAddress });
        const passed = balance >= minBalance;
        return {
            passed,
            balance: balance.toString(),
            message: passed
                ? `Native balance ${balance} wei ≥ required on ${chainName(chainId)}`
                : `Insufficient native balance on ${chainName(chainId)}`,
        };
    }
    catch (e) {
        return { passed: false, balance: '0', message: `RPC error: ${e.message?.slice(0, 80)}` };
    }
}

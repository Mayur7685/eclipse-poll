import dotenv from 'dotenv';
dotenv.config(); // MUST be first — signing.ts reads process.env at module load time

import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { getUserToken, getUserMeta } from './oauth.js';

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    // Allow all localhost origins (dev) + Vercel deployments + the configured frontend URL
    const allowed = [
      /^http:\/\/localhost(:\d+)?$/,
      /\.vercel\.app$/,
      /\.render\.com$/,
    ];
    const FRONTEND_URL = process.env.FRONTEND_URL;
    if (!origin || allowed.some(p => p.test(origin)) || (FRONTEND_URL && origin === FRONTEND_URL)) {
      callback(null, true);
    } else {
      callback(null, true); // permissive for now — tighten in prod by removing this line
    }
  },
  credentials: true,
}));
app.use(express.json());

const PORT = process.env.PORT || 4000;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'communities.json');

const DEFAULT_COMMUNITIES: any[] = [];

function loadStore(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const store = JSON.parse(data);
      if (Array.isArray(store) && store.length > 0) return store;
    }
  } catch (err) {
    console.error('Error reading communities file:', err);
  }
  return DEFAULT_COMMUNITIES;
}

const communitiesStore: any[] = loadStore();

function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(communitiesStore, null, 2));
  } catch (err) {
    console.error('Error persisting communities file:', err);
  }
}

// Health check
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});




// --- Communities Endpoints ---

app.get(['/communities', '/api/communities'], (req: Request, res: Response) => {
  res.json(communitiesStore);
});

app.get(['/communities/:id', '/api/communities/:id'], (req: Request, res: Response) => {
  const rawId = req.params.id.toLowerCase();
  const normalizedId = rawId.startsWith('0x') ? rawId.replace(/^0x0+/, '0x') : rawId;

  const comm = communitiesStore.find((c) => {
    if (!c.community_id) return false;
    const cid = c.community_id.toLowerCase();
    const normCid = cid.startsWith('0x') ? cid.replace(/^0x0+/, '0x') : cid;
    return cid === rawId || normCid === normalizedId || (c.name && c.name.toLowerCase() === rawId);
  });

  if (!comm) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }
  res.json(comm);
});

app.post(['/communities/confirm', '/api/communities/confirm'], (req: Request, res: Response) => {
  const existing = communitiesStore.find((c) => c.community_id === req.body.community_id);
  if (!existing) {
    const comm = {
      polls: [],
      created_at: Date.now(),
      ...req.body,
    };
    communitiesStore.push(comm);
    persistStore();
    res.json({ status: 'ok', community: comm });
  } else {
    Object.assign(existing, req.body);
    persistStore();
    res.json({ status: 'ok', community: existing });
  }
});

app.post(['/polls/confirm', '/api/polls/confirm'], (req: Request, res: Response) => {
  const poll = {
    created_at_block: Math.floor(Date.now() / 1000),
    ...req.body,
  };
  const targetComm = communitiesStore.find((c) => c.community_id === req.body.community_id) || communitiesStore[0];
  if (targetComm) {
    targetComm.polls = targetComm.polls || [];
    const idx = targetComm.polls.findIndex((p: any) => p.poll_id === poll.poll_id);
    if (idx >= 0) {
      targetComm.polls[idx] = { ...targetComm.polls[idx], ...poll };
    } else {
      targetComm.polls.push(poll);
    }
    persistStore();
  }
  res.json({ status: 'ok', poll });
});

// --- Requirement Checks & Credential Issuance ---

/**
 * Check requirements for a given community against the user's connected accounts.
 * Returns per-requirement pass/fail results.
 *
 * Currently implemented:
 *   FREE        → always pass
 *   ALLOWLIST   → check evmAddress against community.allowlist array
 *
 * OAuth checks (X_FOLLOW, DISCORD_MEMBER, DISCORD_ROLE, GITHUB_ACCOUNT, TELEGRAM_MEMBER)
 * require the OAuth popup flow to complete first — connectedAccounts must include
 * the relevant account type with a userId. These are verified structurally (account
 * must be present) until full OAuth server-side token verification is implemented.
 *
 * On-chain checks (TOKEN_BALANCE, NFT_OWNERSHIP, ONCHAIN_ACTIVITY) are not yet
 * implemented — they require a Midnight or EVM RPC call.
 */
async function checkRequirements(
  community: any,
  evmAddress: string,
  connectedAccounts: Array<{ type: string; identifier: string; displayName?: string }>,
): Promise<Array<{ requirementId: string; passed: boolean; message: string }>> {
  const groups = community?.requirement_groups ?? [];
  const results: Array<{ requirementId: string; passed: boolean; message: string }> = [];

  for (const group of groups) {
    for (const req of group.requirements ?? []) {
      let passed = false;
      let message = 'Not checked';

      switch (req.type) {
        case 'FREE':
          passed = true;
          message = 'Open access';
          break;

        case 'ALLOWLIST': {
          const allowlist: string[] = (req.params?.addresses ?? []).map((a: string) => a.toLowerCase());
          if (allowlist.length === 0) {
            passed = true;
            message = 'No addresses in allowlist (auto-pass)';
          } else {
            passed = allowlist.includes(evmAddress.toLowerCase());
            message = passed ? 'Address is on the allowlist' : 'Address not on allowlist';
          }
          break;
        }

        case 'X_FOLLOW': {
          const twitterAccount = connectedAccounts.find(a => a.type === 'X_TWITTER');
          const twitterId = twitterAccount?.identifier;
          if (!twitterId) { passed = false; message = 'Connect your X / Twitter account'; break; }
          try {
            const apiKey = process.env.TWITTERAPI_IO_KEY;
            if (!apiKey) { passed = false; message = 'TWITTERAPI_IO_KEY not configured'; break; }
            const meta = getUserMeta('twitter', twitterId);
            const username = meta?.username ?? twitterId;
            const target = (req.params?.handle ?? '').replace('@', '').toLowerCase();
            const res2 = await (await import('axios')).default.get(
              'https://api.twitterapi.io/twitter/user/check_follow_relationship',
              { headers: { 'X-API-Key': apiKey }, params: { source_user_name: username.replace('@',''), target_user_name: target } }
            );
            passed = res2.data?.data?.following === true;
            message = passed ? `@${username} follows @${target}` : `@${username} does not follow @${target}`;
          } catch (e: any) { passed = false; message = `Twitter check failed: ${e.message}`; }
          break;
        }

        case 'DISCORD_MEMBER': {
          const discordAccount = connectedAccounts.find(a => a.type === 'DISCORD');
          const discordId = discordAccount?.identifier;
          if (!discordId) { passed = false; message = 'Connect your Discord account'; break; }
          try {
            const userToken = getUserToken('discord', discordId);
            const serverId  = req.params?.serverId ?? '';
            if (userToken) {
              const r = await (await import('axios')).default.get('https://discord.com/api/v10/users/@me/guilds', { headers: { Authorization: `Bearer ${userToken}` } });
              passed = (r.data as { id: string }[]).some(g => g.id === serverId);
            } else if (process.env.DISCORD_BOT_TOKEN) {
              const r = await (await import('axios')).default.get(`https://discord.com/api/v10/guilds/${serverId}/members/${discordId}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }, validateStatus: null });
              passed = r.status === 200;
            } else { passed = false; message = 'Discord bot token not configured'; break; }
            message = passed ? `Member of server` : `Not a member of required Discord server`;
          } catch (e: any) { passed = false; message = `Discord check failed: ${e.message}`; }
          break;
        }

        case 'DISCORD_ROLE': {
          const discordAccount = connectedAccounts.find(a => a.type === 'DISCORD');
          const discordId = discordAccount?.identifier;
          if (!discordId) { passed = false; message = 'Connect your Discord account'; break; }
          if (!process.env.DISCORD_BOT_TOKEN) { passed = false; message = 'DISCORD_BOT_TOKEN not configured'; break; }
          try {
            const r = await (await import('axios')).default.get(
              `https://discord.com/api/v10/guilds/${req.params?.serverId}/members/${discordId}`,
              { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }, validateStatus: null }
            );
            passed = r.status === 200 && (r.data?.roles as string[] ?? []).includes(req.params?.roleId ?? '');
            message = passed ? `Has required Discord role` : `Missing required Discord role`;
          } catch (e: any) { passed = false; message = `Discord role check failed: ${e.message}`; }
          break;
        }

        case 'GITHUB_ACCOUNT': {
          const githubAccount = connectedAccounts.find(a => a.type === 'GITHUB');
          const githubId = githubAccount?.identifier;
          if (!githubId) { passed = false; message = 'Connect your GitHub account'; break; }
          try {
            const userToken = getUserToken('github', githubId);
            const meta      = getUserMeta('github', githubId);
            const username  = meta?.username ?? githubId;
            // Verify account exists via GitHub API
            const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
            if (userToken) headers['Authorization'] = `Bearer ${userToken}`;
            const r = await (await import('axios')).default.get(
              `https://api.github.com/users/${encodeURIComponent(username)}`, { headers, validateStatus: null }
            );
            if (r.status !== 200) { passed = false; message = `GitHub user @${username} not found`; break; }
            const user = r.data as any;
            // Optional checks from requirement params
            if (req.params?.minRepos && user.public_repos < Number(req.params.minRepos)) {
              passed = false; message = `Need ${req.params.minRepos}+ public repos (have ${user.public_repos})`; break;
            }
            if (req.params?.minFollowers && user.followers < Number(req.params.minFollowers)) {
              passed = false; message = `Need ${req.params.minFollowers}+ followers (have ${user.followers})`; break;
            }
            passed = true; message = `GitHub @${username} verified`;
          } catch (e: any) { passed = false; message = `GitHub check failed: ${e.message}`; }
          break;
        }

        case 'TELEGRAM_MEMBER': {
          const telegramAccount = connectedAccounts.find(a => a.type === 'TELEGRAM');
          const telegramId = telegramAccount?.identifier;
          if (!telegramId) { passed = false; message = 'Connect your Telegram account'; break; }
          if (!process.env.TELEGRAM_BOT_TOKEN) { passed = false; message = 'TELEGRAM_BOT_TOKEN not configured'; break; }
          try {
            const r = await (await import('axios')).default.get(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`,
              { params: { chat_id: req.params?.chatId, user_id: telegramId } }
            );
            const status2 = r.data?.result?.status as string ?? '';
            passed = ['member','administrator','creator'].includes(status2);
            message = passed ? `Telegram member verified` : `Not a member of required Telegram group`;
          } catch (e: any) { passed = false; message = `Telegram check failed: ${e.message}`; }
          break;
        }

        case 'TOKEN_BALANCE': {
          if (!evmAddress) {
            passed = false;
            message = 'No EVM wallet address provided';
            break;
          }
          try {
            const { checkTokenBalance } = await import('./evmChecker.js');
            const result = await checkTokenBalance(
              req.params?.chainId ?? 1,
              req.params?.tokenAddress,
              evmAddress,
              BigInt(req.params?.minBalance ?? '1'),
            );
            passed = result.passed;
            message = result.message;
          } catch (err: any) {
            passed = false;
            message = `Token balance check failed: ${err?.message ?? 'unknown error'}`;
          }
          break;
        }

        case 'NFT_OWNERSHIP': {
          if (!evmAddress) {
            passed = false;
            message = 'No EVM wallet address provided';
            break;
          }
          try {
            const { checkNftOwnership } = await import('./evmChecker.js');
            const result = await checkNftOwnership(
              req.params?.chainId ?? 1,
              req.params?.contractAddress,
              evmAddress,
              req.params?.tokenId,
            );
            passed = result.passed;
            message = result.message;
          } catch (err: any) {
            passed = false;
            message = `NFT ownership check failed: ${err?.message ?? 'unknown error'}`;
          }
          break;
        }

        case 'ONCHAIN_ACTIVITY':
        case 'DOMAIN_OWNERSHIP':
          // TODO: implement on-chain checks via Midnight/EVM RPC
          // For now, auto-fail so users know these are not yet verified
          passed = false;
          message = `On-chain check for ${req.type} not yet implemented — contact community admin`;
          break;

        default:
          passed = false;
          message = `Unknown requirement type: ${req.type}`;
      }

      results.push({ requirementId: req.id ?? req.type, passed, message });
    }
  }

  // Empty requirement groups = FREE community
  if (results.length === 0) {
    results.push({ requirementId: 'auto', passed: true, message: 'Open community — no requirements' });
  }

  return results;
}

app.post(['/verify/check', '/api/verify/check'], async (req: Request, res: Response) => {
  const { communityId, evmAddress, connectedAccounts = [] } = req.body;
  const community = communitiesStore.find((c) => c.community_id === communityId);

  if (!community) {
    // Community not found — could be FREE or just not registered yet
    res.json({
      passed: true,
      results: [{ requirementId: 'auto', passed: true, message: 'Community not found — treating as open' }],
    });
    return;
  }

  const results = await checkRequirements(community, evmAddress ?? '', connectedAccounts);

  // Determine overall pass: for each group, all requirements must pass (AND within group)
  // If any group passes entirely → overall pass (OR between groups)
  const groups = community?.requirement_groups ?? [];
  let passed: boolean;

  if (groups.length === 0) {
    passed = true;
  } else {
    passed = groups.some((group: any) => {
      const groupReqs = group.requirements ?? [];
      if (groupReqs.length === 0) return true;
      if (group.logic === 'OR') {
        return groupReqs.some((req: any) =>
          results.find(r => r.requirementId === (req.id ?? req.type))?.passed
        );
      }
      // AND (default)
      return groupReqs.every((req: any) =>
        results.find(r => r.requirementId === (req.id ?? req.type))?.passed
      );
    });
  }

  res.json({ passed, results });
});


// --- Pinata IPFS Proxy ---

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.VITE_PINATA_GATEWAY ?? 'https://gateway.pinata.cloud';

async function pinToIPFS(data: object, name: string): Promise<string> {
  if (!PINATA_JWT) {
    // No JWT — fall back to fake CID (dev mode)
    console.warn('[pinata] PINATA_JWT not set, using fake CID');
    return 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: data,
      pinataMetadata: { name },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata API error ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json() as { IpfsHash: string };
  return json.IpfsHash;
}

async function pinImageToIPFS(file: Buffer, filename: string, mimetype: string): Promise<{ cid: string; url: string }> {
  if (!PINATA_JWT) {
    const fakeCid = 'Qm' + Math.random().toString(36).substring(2, 15);
    return { cid: fakeCid, url: 'https://midnight.network/favicon.ico' };
  }
  const formData = new FormData();
  const blob = new Blob([file as unknown as BlobPart], { type: mimetype });
  formData.append('file', blob, filename);
  formData.append('pinataMetadata', JSON.stringify({ name: filename }));

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData as any,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata image upload error ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json() as { IpfsHash: string };
  const cid = json.IpfsHash;
  const url = `${PINATA_GATEWAY}/ipfs/${cid}`;
  return { cid, url };
}

app.post(['/pin/community', '/api/pin/community'], async (req: Request, res: Response) => {
  const comm = {
    community_id: req.body.community_id || '0x' + Math.floor(Math.random() * 1e16).toString(16).padStart(64, '0'),
    polls: [],
    created_at: Date.now(),
    ...req.body,
  };

  // Upsert into local store
  const existingIndex = communitiesStore.findIndex((c) => c.community_id === comm.community_id);
  if (existingIndex < 0) {
    communitiesStore.push(comm);
  } else {
    communitiesStore[existingIndex] = { ...communitiesStore[existingIndex], ...comm };
  }
  persistStore();

  try {
    const cid = await pinToIPFS(comm, `eclipse-community-${comm.community_id.slice(0, 8)}`);
    // Store CID back
    const idx = communitiesStore.findIndex((c) => c.community_id === comm.community_id);
    if (idx >= 0) { communitiesStore[idx].ipfs_cid = cid; persistStore(); }
    res.json({ cid, community: { ...comm, ipfs_cid: cid } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/pin/poll', '/api/pin/poll'], async (req: Request, res: Response) => {
  const poll = {
    poll_id: req.body.poll_id || '0x' + Math.floor(Math.random() * 1e16).toString(16).padStart(64, '0'),
    created_at_block: Math.floor(Date.now() / 1000),
    ...req.body,
  };
  const targetComm = communitiesStore.find((c) => c.community_id === req.body.community_id) || communitiesStore[0];
  if (targetComm) {
    targetComm.polls = targetComm.polls || [];
    const idx = targetComm.polls.findIndex((p: any) => p.poll_id === poll.poll_id);
    if (idx >= 0) targetComm.polls[idx] = { ...targetComm.polls[idx], ...poll };
    else targetComm.polls.push(poll);
    persistStore();
  }

  try {
    const cid = await pinToIPFS(poll, `eclipse-poll-${poll.poll_id.slice(0, 8)}`);
    res.json({ cid, poll: { ...poll, ipfs_cid: cid } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/pin/image', '/api/pin/image'], async (req: Request, res: Response) => {
  try {
    // Expect multipart/form-data with a 'file' field
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const filename = (req.headers['x-filename'] as string) || 'image.png';
        const mimetype = (req.headers['content-type'] as string) || 'image/png';
        const result = await pinImageToIPFS(buffer, filename, mimetype);
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Vote Submissions (Supabase DB) ──────────────────────────────────────────
// Uses Supabase free tier as persistent storage.
// Falls back to in-memory JSON if SUPABASE_URL not configured.
//
// Supabase setup:
//   1. Create project at https://supabase.com (free, no credit card)
//   2. Run this SQL in Supabase SQL editor:
//      CREATE TABLE submissions (
//        address    TEXT NOT NULL,
//        poll_id    TEXT NOT NULL,
//        ciphertext TEXT NOT NULL,
//        saved_at   BIGINT NOT NULL,
//        PRIMARY KEY (address, poll_id)
//      );
//   3. Set env vars: SUPABASE_URL and SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

// In-memory fallback when Supabase not configured
type SubRecord = { pollId: string; ciphertext: string; savedAt: number };
const _memStore: Record<string, SubRecord[]> = {};

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (supabase) {
  console.log('[submissions] Using Supabase for persistent storage');
} else {
  console.warn('[submissions] SUPABASE_URL/SUPABASE_ANON_KEY not set — using in-memory fallback (data lost on restart)');
}

app.post(['/submissions', '/api/submissions'], async (req: Request, res: Response) => {
  const { address, pollId, ciphertext } = req.body as { address: string; pollId: string; ciphertext: string };
  if (!address || !pollId || !ciphertext) { res.status(400).json({ error: 'address, pollId, ciphertext required' }); return; }
  const addr = address.toLowerCase();

  try {
    if (supabase) {
      await supabase.from('submissions').upsert(
        { address: addr, poll_id: pollId, ciphertext, saved_at: Date.now() },
        { onConflict: 'address,poll_id' }
      );
    } else {
      // In-memory fallback
      if (!_memStore[addr]) _memStore[addr] = [];
      const idx = _memStore[addr].findIndex(s => s.pollId === pollId);
      const entry: SubRecord = { pollId, ciphertext, savedAt: Date.now() };
      if (idx >= 0) _memStore[addr][idx] = entry;
      else _memStore[addr].push(entry);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/submissions/:address', '/api/submissions/:address'], async (req: Request, res: Response) => {
  const addr = (req.params.address as string).toLowerCase();
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('submissions')
        .select('poll_id, ciphertext, saved_at')
        .eq('address', addr);
      if (error) throw error;
      const rows = (data ?? []).map((r: any) => ({ pollId: r.poll_id, ciphertext: r.ciphertext, savedAt: r.saved_at }));
      res.json(rows);
    } else {
      res.json((_memStore[addr] ?? []).map(s => ({ pollId: s.pollId, ciphertext: s.ciphertext, savedAt: s.savedAt })));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── OAuth Routes (server-side only — no client IDs on frontend) ─────────────
// Pattern: frontend opens popup → API redirects to provider → callback exchanges
// code server-side → popupSuccess/popupError sent back to opener via BroadcastChannel.

import { generateState, consumeState, pkce, popupSuccess, popupError, storeUserToken } from './oauth.js';
import axios from 'axios';

const APP_URL = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000';

// ── GitHub OAuth ──────────────────────────────────────────────────────────────
app.get(['/auth/github', '/api/auth/github'], (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) { res.status(500).send(popupError('eclipse-poll-github', 'GITHUB_CLIENT_ID not configured')); return; }
  const state    = generateState();
  const redirect = `${APP_URL}/auth/github/callback`;
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&scope=read:user&state=${state}`);
});

app.get(['/auth/github/callback', '/api/auth/github/callback'], async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) { res.send(popupError('eclipse-poll-github', error)); return; }
  if (!consumeState(state)) { res.send(popupError('eclipse-poll-github', 'Invalid or expired OAuth state')); return; }
  const clientId     = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
  try {
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token',
      { client_id: clientId, client_secret: clientSecret, code },
      { headers: { Accept: 'application/json' } });
    const accessToken = tokenRes.data.access_token as string;
    const userRes = await axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}` } });
    const { id, login, name } = userRes.data as any;
    storeUserToken('github', String(id), accessToken, 7200, login);
    res.send(popupSuccess('eclipse-poll-github', { userId: String(id), username: login, displayName: name ?? login }));
  } catch (e: any) {
    res.send(popupError('eclipse-poll-github', e.message ?? 'GitHub OAuth failed'));
  }
});

// ── Discord OAuth ─────────────────────────────────────────────────────────────
app.get(['/auth/discord', '/api/auth/discord'], (_req: Request, res: Response) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) { res.status(500).send(popupError('eclipse-poll-discord', 'DISCORD_CLIENT_ID not configured')); return; }
  const state    = generateState();
  const redirect = `${APP_URL}/auth/discord/callback`;
  res.redirect(`https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=identify+guilds&state=${state}`);
});

app.get(['/auth/discord/callback', '/api/auth/discord/callback'], async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) { res.send(popupError('eclipse-poll-discord', error)); return; }
  if (!consumeState(state)) { res.send(popupError('eclipse-poll-discord', 'Invalid or expired OAuth state')); return; }
  const clientId     = process.env.DISCORD_CLIENT_ID!;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
  const redirect     = `${APP_URL}/auth/discord/callback`;
  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirect }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const accessToken = tokenRes.data.access_token as string;
    const expiresIn   = (tokenRes.data.expires_in as number) ?? 604800;
    const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${accessToken}` } });
    const { id, username } = userRes.data as any;
    storeUserToken('discord', id, accessToken, expiresIn, username);
    res.send(popupSuccess('eclipse-poll-discord', { userId: id, username }));
  } catch (e: any) {
    res.send(popupError('eclipse-poll-discord', e.message ?? 'Discord OAuth failed'));
  }
});

// ── Twitter/X OAuth2 PKCE ─────────────────────────────────────────────────────
app.get(['/auth/twitter', '/api/auth/twitter'], (_req: Request, res: Response) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) { res.status(500).send(popupError('eclipse-poll-twitter', 'TWITTER_CLIENT_ID not configured')); return; }
  const { codeVerifier, codeChallenge } = pkce();
  const state    = generateState({ codeVerifier });
  const redirect = `${APP_URL}/auth/twitter/callback`;
  const params   = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirect, scope: 'users.read tweet.read offline.access', state, code_challenge: codeChallenge, code_challenge_method: 'S256' });
  res.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
});

app.get(['/auth/twitter/callback', '/api/auth/twitter/callback'], async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  if (error) { res.send(popupError('eclipse-poll-twitter', error)); return; }
  const entry = consumeState(state);
  if (!entry) { res.send(popupError('eclipse-poll-twitter', 'Invalid or expired OAuth state')); return; }
  const clientId     = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const redirect     = `${APP_URL}/auth/twitter/callback`;
  try {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: clientId, code_verifier: entry.codeVerifier! }).toString();
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (clientSecret) headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    const tokenRes = await axios.post('https://api.twitter.com/2/oauth2/token', body, { headers });
    const accessToken = tokenRes.data.access_token as string;
    const expiresIn   = (tokenRes.data.expires_in as number) ?? 7200;
    const meRes = await axios.get('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    const { id, username, name } = meRes.data.data as any;
    storeUserToken('twitter', id, accessToken, expiresIn, username);
    res.send(popupSuccess('eclipse-poll-twitter', { userId: id, username, displayName: name ?? username }));
  } catch (e: any) {
    const detail = e?.response?.data?.error_description ?? e?.response?.data?.detail ?? e.message;
    res.send(popupError('eclipse-poll-twitter', String(detail)));
  }
});



app.get(['/key-backup/:address', '/api/key-backup/:address'], async (req: Request, res: Response) => {
  const addr = (req.params.address as string).toLowerCase();
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('key_backups')
        .select('encrypted_key')
        .eq('address', addr)
        .single();
      if (error || !data) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ encrypted_key: (data as any).encrypted_key });
    } else {
      const key = (_memStore as any)[`__key__${addr}`];
      if (!key) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ encrypted_key: key });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`Eclipse Attestation & Metadata API running on port ${PORT}`);
  console.log(`Pinata IPFS: ${PINATA_JWT ? '✅ real uploads' : '⚠️  fake CIDs (set PINATA_JWT)'}`);
});
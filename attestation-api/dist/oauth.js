// OAuth state management + popup-close HTML helper.
// Matches FHEpoll verifier pattern exactly.
// No client IDs needed on the frontend — all OAuth happens server-side.
import crypto from 'crypto';
const _tokens = new Map();
export function storeUserToken(platform, userId, token, expiresInSecs = 7200, username) {
    _tokens.set(`${platform}:${userId}`, { token, username, expiresAt: Date.now() + expiresInSecs * 1000 });
}
export function getUserToken(platform, userId) {
    const entry = _tokens.get(`${platform}:${userId}`);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        _tokens.delete(`${platform}:${userId}`);
        return null;
    }
    return entry.token;
}
export function getUserMeta(platform, userId) {
    const entry = _tokens.get(`${platform}:${userId}`);
    if (!entry || Date.now() > entry.expiresAt)
        return null;
    return { username: entry.username };
}
const _states = new Map();
export function generateState(extra) {
    const state = crypto.randomBytes(16).toString('hex');
    _states.set(state, { ts: Date.now(), ...extra });
    return state;
}
export function consumeState(state) {
    const entry = _states.get(state);
    if (!entry)
        return null;
    _states.delete(state);
    if (Date.now() - entry.ts > 10 * 60 * 1000)
        return null; // 10 min TTL
    return entry;
}
export function pkce() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}
export function popupSuccess(channelName, data) {
    const payload = JSON.stringify({ status: 'success', channel: channelName, ...data });
    return `<!DOCTYPE html><html><head><title>Connected</title></head><body>
<p style="font-family:sans-serif;text-align:center;padding:48px 24px;color:#555;font-size:15px">Connected! Closing…</p>
<script>
  const payload = ${payload}
  if (window.opener) { window.opener.postMessage(payload, '*') }
  try { const ch = new BroadcastChannel(${JSON.stringify(channelName)}); ch.postMessage(payload); setTimeout(() => ch.close(), 500) } catch(_) {}
  setTimeout(() => window.close(), 500)
</script></body></html>`;
}
export function popupError(channelName, message) {
    const payload = JSON.stringify({ status: 'error', channel: channelName, message });
    const safe = message.replace(/</g, '&lt;');
    return `<!DOCTYPE html><html><head><title>Error</title></head><body>
<p style="font-family:sans-serif;text-align:center;padding:48px 24px;color:#c00;font-size:15px">${safe}</p>
<script>
  const payload = ${payload}
  if (window.opener) { window.opener.postMessage(payload, '*') }
  try { const ch = new BroadcastChannel(${JSON.stringify(channelName)}); ch.postMessage(payload); setTimeout(() => ch.close(), 500) } catch(_) {}
  setTimeout(() => window.close(), 3000)
</script></body></html>`;
}

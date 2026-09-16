// OAuth callback page — opened as a popup by oauthConnect.ts.
// Reads URL params/hash, posts the auth data back to the opener, then closes.

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash   = new URLSearchParams(window.location.hash.slice(1));

    const payload: Record<string, string> = { type: 'OAUTH_CALLBACK', provider: provider ?? '' };

    // Collect all params from query string and hash fragment
    for (const [k, v] of params.entries()) payload[k] = v;
    for (const [k, v] of hash.entries())   payload[k] = v;

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
    }

    // Close after a short delay so the message is received
    setTimeout(() => window.close(), 300);
  }, [provider]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-[#0070F3] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Completing authentication…</p>
      </div>
    </div>
  );
}

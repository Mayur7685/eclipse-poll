export interface SchnorrAttestation {
  announcement: {
    x: bigint;
    y: bigint;
  };
  response: bigint;
  providerPk: {
    x: bigint;
    y: bigint;
  };
  credType: bigint;
}

export async function requestAllowlistAttestation(
  pollIdHash: string,
  userPubKeyHash: string,
  userAddress: string,
  apiBaseUrl = '/attest',
): Promise<SchnorrAttestation> {
  const res = await fetch(`${apiBaseUrl}/allowlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pollIdHash, userPubKeyHash, userAddress }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Attestation failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    announcement: {
      x: BigInt(data.announcement.x),
      y: BigInt(data.announcement.y),
    },
    response: BigInt(data.response),
    providerPk: {
      x: BigInt(data.providerPk.x),
      y: BigInt(data.providerPk.y),
    },
    credType: BigInt(data.credType),
  };
}

export async function requestSocialOAuthAttestation(
  provider: 'github' | 'discord' | 'twitter',
  code: string,
  pollIdHash: string,
  userPubKeyHash: string,
  apiBaseUrl = '/attest',
): Promise<SchnorrAttestation> {
  const res = await fetch(`${apiBaseUrl}/oauth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider, code, pollIdHash, userPubKeyHash }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Attestation failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    announcement: {
      x: BigInt(data.announcement.x),
      y: BigInt(data.announcement.y),
    },
    response: BigInt(data.response),
    providerPk: {
      x: BigInt(data.providerPk.x),
      y: BigInt(data.providerPk.y),
    },
    credType: BigInt(data.credType),
  };
}

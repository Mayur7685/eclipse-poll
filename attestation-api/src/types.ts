export enum CredentialType {
  FREE = 0,
  ALLOWLIST = 1,
  SOCIAL_OAUTH = 2,
}

export interface AllowlistAttestRequest {
  pollIdHash: string; // hex string of 32 bytes
  userPubKeyHash: string; // hex string
  userAddress: string; // EVM or Midnight address to check against allowlist
}

export interface SocialOAuthAttestRequest {
  provider: 'github' | 'discord' | 'twitter';
  code: string;
  pollIdHash: string;
  userPubKeyHash: string;
}

export interface AttestationResult {
  announcement: {
    x: string;
    y: string;
  };
  response: string;
  providerPk: {
    x: string;
    y: string;
  };
  credType: number;
}

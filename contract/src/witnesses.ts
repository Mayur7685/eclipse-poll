import { ecMulGenerator, jubjubPointX, jubjubPointY } from '@midnight-ntwrk/compact-runtime';

export type EclipsePollPrivateState = {
  userSecretKey:    Uint8Array;
  voteChoice:       bigint;
  rankedWeights:    bigint[];
  approvalChoices:  boolean[];
  layerWeights:     bigint[][];
  layerParents:     bigint[];
  // Attestation for credentialed VOTES (castCredentialedBinaryVote etc.)
  // Uses nonce-based approach: store k, reconstruct R = k*G via ecMulGenerator
  attestationNonce:    bigint | null;
  attestationResponse: bigint;
  attestationCredType: bigint;
  attestationPollId:   Uint8Array;
  // Legacy field — kept for type compat, not used
  attestationSignature: null;
};

const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;

export const witnesses = {
  getUserSecret: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.userSecretKey],

  getVoteChoice: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.voteChoice],

  getRankedWeights: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.rankedWeights],

  getApprovalChoices: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.approvalChoices],

  getLayerWeights: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.layerWeights],

  getLayerParents: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.layerParents],

  getAttestation: (ctx: { privateState: EclipsePollPrivateState }) => {
    const nonce = ctx.privateState.attestationNonce;

    // ecMulGenerator(k) gives the valid Opaque<"JubjubPoint"> announcement R = k*G
    // This is the only way to construct a JubjubPoint the ZK prover accepts
    const announcement = ecMulGenerator(nonce ?? 1n);
    const response     = ctx.privateState.attestationResponse ?? 0n;

    // Verify we can round-trip the point (sanity check, remove in prod)
    const ax = jubjubPointX(announcement);
    const ay = jubjubPointY(announcement);
    console.log('[getAttestation] R.x slice:', ax.toString().slice(0, 10), 'nonce:', nonce?.toString().slice(0, 8));

    const sig = { announcement, response };
    return [ctx.privateState, [
      sig,
      ctx.privateState.attestationCredType,
      ctx.privateState.attestationPollId,
    ]];
  },

  getSchnorrReduction: (
    ctx: { privateState: EclipsePollPrivateState },
    challengeHash: bigint,
  ) => {
    const q = challengeHash / TWO_248;
    const r = challengeHash % TWO_248;
    return [ctx.privateState, [q, r]];
  },
};

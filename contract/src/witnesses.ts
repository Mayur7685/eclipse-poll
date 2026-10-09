import { constructJubjubPoint, jubjubPointX, jubjubPointY } from '@midnight-ntwrk/compact-runtime';

export type EclipsePollPrivateState = {
  userSecretKey:    Uint8Array;
  voteChoice:       bigint;
  rankedWeights:    bigint[];
  approvalChoices:  boolean[];
  layerWeights:     bigint[][];
  layerParents:     bigint[];
  // Attestation for credentialed VOTES (castCredentialedBinaryVote etc.)
  // Store announcement coordinates from the API; use constructJubjubPoint(x,y)
  // which returns the proper JubjubPoint the compact-runtime circuit expects.
  attestationAnnouncementX: bigint;
  attestationAnnouncementY: bigint;
  attestationNonce:    bigint | null;   // kept for backward compat
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
    const x = ctx.privateState.attestationAnnouncementX ?? 0n;
    const y = ctx.privateState.attestationAnnouncementY ?? 0n;

    // constructJubjubPoint(x, y) returns the proper JubjubPoint that the
    // compact-runtime circuit validator accepts at execution time.
    // ecMulGenerator() returns an opaque WASM handle that works inside
    // circuit execution but NOT when passed in from TypeScript witnesses.
    const announcement = constructJubjubPoint(x, y);
    const response     = ctx.privateState.attestationResponse ?? 0n;

    console.log('[getAttestation] ann.x:', jubjubPointX(announcement).toString().slice(0, 10));

    return [ctx.privateState, [
      { announcement, response },
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

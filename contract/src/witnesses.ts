export type EclipsePollPrivateState = {
  userSecretKey:    Uint8Array;
  voteChoice:       bigint;
  rankedWeights:    bigint[];
  approvalChoices:  boolean[];
  layerWeights:     bigint[][];
  layerParents:     bigint[];
  // Attestation (for credentialed votes)
  attestationSignature: {
    announcement: { x: bigint; y: bigint };
    response: bigint;
  } | null;
  attestationCredType: bigint;
  attestationPollId: Uint8Array;
};

const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;

// Valid JubjubCurve generator point — safe dummy for null attestation
const GENERATOR = {
  x: 28336281903124990867587793011069573392383982287722241916350956173377953689573n,
  y: 39385640392217313770878525135509063452020585410343666726093009378539878503883n,
};

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
    const sig = ctx.privateState.attestationSignature ?? {
      announcement: GENERATOR,
      response: 0n,
    };
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

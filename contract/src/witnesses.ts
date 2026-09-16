export type EclipsePollPrivateState = {
  userSecretKey: Uint8Array;
  voteChoice: bigint;
  rankedWeights: bigint[];
};

export const witnesses = {
  getUserSecret: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.userSecretKey],

  getVoteChoice: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.voteChoice],

  getRankedWeights: (ctx: { privateState: EclipsePollPrivateState }) =>
    [ctx.privateState, ctx.privateState.rankedWeights],
};

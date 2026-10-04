export type EclipsePollPrivateState = {
  userSecretKey:    Uint8Array;
  voteChoice:       bigint;
  rankedWeights:    bigint[];
  approvalChoices:  boolean[];
  // Hierarchical voting: up to 4 layers × 8 options
  layerWeights:     bigint[][];  // [layer][optionIdx] = Borda weight
  layerParents:     bigint[];    // [layer] = parentId (0 = root)
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
};

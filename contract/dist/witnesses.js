export const witnesses = {
    getUserSecret: (ctx) => [ctx.privateState, ctx.privateState.userSecretKey],
    getVoteChoice: (ctx) => [ctx.privateState, ctx.privateState.voteChoice],
    getRankedWeights: (ctx) => [ctx.privateState, ctx.privateState.rankedWeights],
    getApprovalChoices: (ctx) => [ctx.privateState, ctx.privateState.approvalChoices],
    getLayerWeights: (ctx) => [ctx.privateState, ctx.privateState.layerWeights],
    getLayerParents: (ctx) => [ctx.privateState, ctx.privateState.layerParents],
};

const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
export const witnesses = {
    getUserSecret: (ctx) => [ctx.privateState, ctx.privateState.userSecretKey],
    getVoteChoice: (ctx) => [ctx.privateState, ctx.privateState.voteChoice],
    getRankedWeights: (ctx) => [ctx.privateState, ctx.privateState.rankedWeights],
    getApprovalChoices: (ctx) => [ctx.privateState, ctx.privateState.approvalChoices],
    getLayerWeights: (ctx) => [ctx.privateState, ctx.privateState.layerWeights],
    getLayerParents: (ctx) => [ctx.privateState, ctx.privateState.layerParents],
    getSchnorrReduction: (ctx, challengeHash) => {
        const q = challengeHash / TWO_248;
        const r = challengeHash % TWO_248;
        return [ctx.privateState, [q, r]];
    },
};

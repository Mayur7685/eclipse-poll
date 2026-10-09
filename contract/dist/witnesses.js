// No compact-runtime imports needed — getAttestation returns plain bigint Fields
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
export const witnesses = {
    getUserSecret: (ctx) => [ctx.privateState, ctx.privateState.userSecretKey],
    getVoteChoice: (ctx) => [ctx.privateState, ctx.privateState.voteChoice],
    getRankedWeights: (ctx) => [ctx.privateState, ctx.privateState.rankedWeights],
    getApprovalChoices: (ctx) => [ctx.privateState, ctx.privateState.approvalChoices],
    getLayerWeights: (ctx) => [ctx.privateState, ctx.privateState.layerWeights],
    getLayerParents: (ctx) => [ctx.privateState, ctx.privateState.layerParents],
    getAttestation: (ctx) => {
        const x = ctx.privateState.attestationAnnouncementX ?? 0n;
        const y = ctx.privateState.attestationAnnouncementY ?? 0n;
        const response = ctx.privateState.attestationResponse ?? 0n;
        // credType must be a JS number (0-2), not bigint — the compiled validator checks typeof === 'number'
        const credType = Number(ctx.privateState.attestationCredType ?? 0n);
        const pollId = ctx.privateState.attestationPollId;
        console.log('[getAttestation] ann_x slice:', x.toString().slice(0, 10));
        return [ctx.privateState, [x, y, response, credType, pollId]];
    },
    getSchnorrReduction: (ctx, challengeHash) => {
        const q = challengeHash / TWO_248;
        const r = challengeHash % TWO_248;
        return [ctx.privateState, [q, r]];
    },
};

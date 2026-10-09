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
        // Return ann_x, ann_y, response as plain bigint Fields — the circuit
        // reconstructs the JubjubPoint using constructJubjubPoint(ann_x, ann_y).
        // This avoids ever passing an opaque JubjubPoint from TS witnesses,
        // which fails during ZK proof generation.
        console.log('[getAttestation] ann_x slice:', x.toString().slice(0, 10));
        return [ctx.privateState, [
                x,
                y,
                response,
                ctx.privateState.attestationCredType,
                ctx.privateState.attestationPollId,
            ]];
    },
    getSchnorrReduction: (ctx, challengeHash) => {
        const q = challengeHash / TWO_248;
        const r = challengeHash % TWO_248;
        return [ctx.privateState, [q, r]];
    },
};

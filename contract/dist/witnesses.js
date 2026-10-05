const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
// Valid JubjubCurve generator point — safe dummy for null attestation
const GENERATOR = {
    x: 28336281903124990867587793011069573392383982287722241916350956173377953689573n,
    y: 39385640392217313770878525135509063452020585410343666726093009378539878503883n,
};
export const witnesses = {
    getUserSecret: (ctx) => [ctx.privateState, ctx.privateState.userSecretKey],
    getVoteChoice: (ctx) => [ctx.privateState, ctx.privateState.voteChoice],
    getRankedWeights: (ctx) => [ctx.privateState, ctx.privateState.rankedWeights],
    getApprovalChoices: (ctx) => [ctx.privateState, ctx.privateState.approvalChoices],
    getLayerWeights: (ctx) => [ctx.privateState, ctx.privateState.layerWeights],
    getLayerParents: (ctx) => [ctx.privateState, ctx.privateState.layerParents],
    getAttestation: (ctx) => {
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
    getSchnorrReduction: (ctx, challengeHash) => {
        const q = challengeHash / TWO_248;
        const r = challengeHash % TWO_248;
        return [ctx.privateState, [q, r]];
    },
};

import { ecMulGenerator, jubjubPointX, jubjubPointY } from '@midnight-ntwrk/compact-runtime';
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
export const witnesses = {
    getUserSecret: (ctx) => [ctx.privateState, ctx.privateState.userSecretKey],
    getVoteChoice: (ctx) => [ctx.privateState, ctx.privateState.voteChoice],
    getRankedWeights: (ctx) => [ctx.privateState, ctx.privateState.rankedWeights],
    getApprovalChoices: (ctx) => [ctx.privateState, ctx.privateState.approvalChoices],
    getLayerWeights: (ctx) => [ctx.privateState, ctx.privateState.layerWeights],
    getLayerParents: (ctx) => [ctx.privateState, ctx.privateState.layerParents],
    getAttestation: (ctx) => {
        const nonce = ctx.privateState.attestationNonce;
        // ecMulGenerator(k) gives the valid Opaque<"JubjubPoint"> announcement R = k*G
        // This is the only way to construct a JubjubPoint the ZK prover accepts
        const announcement = ecMulGenerator(nonce ?? 1n);
        const response = ctx.privateState.attestationResponse ?? 0n;
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
    getSchnorrReduction: (ctx, challengeHash) => {
        const q = challengeHash / TWO_248;
        const r = challengeHash % TWO_248;
        return [ctx.privateState, [q, r]];
    },
};

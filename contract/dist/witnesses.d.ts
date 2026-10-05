export type EclipsePollPrivateState = {
    userSecretKey: Uint8Array;
    voteChoice: bigint;
    rankedWeights: bigint[];
    approvalChoices: boolean[];
    layerWeights: bigint[][];
    layerParents: bigint[];
    attestationSignature: {
        announcement: {
            x: bigint;
            y: bigint;
        };
        response: bigint;
    } | null;
    attestationCredType: bigint;
    attestationPollId: Uint8Array;
};
export declare const witnesses: {
    getUserSecret: (ctx: {
        privateState: EclipsePollPrivateState;
    }) => (Uint8Array<ArrayBufferLike> | EclipsePollPrivateState)[];
    getVoteChoice: (ctx: {
        privateState: EclipsePollPrivateState;
    }) => (bigint | EclipsePollPrivateState)[];
    getRankedWeights: (ctx: {
        privateState: EclipsePollPrivateState;
    }) => (bigint[] | EclipsePollPrivateState)[];
    getApprovalChoices: (ctx: {
        privateState: EclipsePollPrivateState;
    }) => (boolean[] | EclipsePollPrivateState)[];
    getLayerWeights: (ctx: {
        privateState: EclipsePollPrivateState;
    }) => (bigint[][] | EclipsePollPrivateState)[];
    getLayerParents: (ctx: {
        privateState: EclipsePollPrivateState;
    }) => (bigint[] | EclipsePollPrivateState)[];
    getAttestation: (ctx: {
        privateState: EclipsePollPrivateState;
    }) => (EclipsePollPrivateState | (bigint | Uint8Array<ArrayBufferLike> | {
        announcement: {
            x: bigint;
            y: bigint;
        };
        response: bigint;
    })[])[];
    getSchnorrReduction: (ctx: {
        privateState: EclipsePollPrivateState;
    }, challengeHash: bigint) => (bigint[] | EclipsePollPrivateState)[];
};

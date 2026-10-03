export type EclipsePollPrivateState = {
    userSecretKey: Uint8Array;
    voteChoice: bigint;
    rankedWeights: bigint[];
    approvalChoices: boolean[];
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
};

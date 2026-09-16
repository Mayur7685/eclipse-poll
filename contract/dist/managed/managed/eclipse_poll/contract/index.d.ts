import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum PollType { SIMPLE = 0, RANKED_CHOICE = 1, HIERARCHICAL = 2 }

export enum CredentialType { FREE = 0, ALLOWLIST = 1, SOCIAL_OAUTH = 2 }

export type UserSecretKey = Uint8Array;

export type UserPublicKey = Uint8Array;

export type AdminPublicKey = Uint8Array;

export type PollId = Uint8Array;

export type Nullifier = Uint8Array;

export type CommunityOnChainConfig = { creator: UserPublicKey;
                                       credType: CredentialType;
                                       configHash: Uint8Array
                                     };

export type PollConfig = { creator: UserPublicKey;
                           pollType: PollType;
                           credType: CredentialType;
                           optionCount: bigint;
                           endTime: bigint;
                           isClosed: boolean
                         };

export type Witnesses<PS> = {
  getUserSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, UserSecretKey];
  getVoteChoice(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  getRankedWeights(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint[]];
}

export type ImpureCircuits<PS> = {
  registerCommunity(context: __compactRuntime.CircuitContext<PS>,
                    communityId_0: Uint8Array,
                    configHash_0: Uint8Array,
                    credType_0: CredentialType): __compactRuntime.CircuitResults<PS, []>;
  createPoll(context: __compactRuntime.CircuitContext<PS>,
             pollId_0: PollId,
             pollType_0: PollType,
             credType_0: CredentialType,
             optionCount_0: bigint,
             endTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  castBinaryVote(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
  castRankedVote(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
  closePoll(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerCommunity(context: __compactRuntime.CircuitContext<PS>,
                    communityId_0: Uint8Array,
                    configHash_0: Uint8Array,
                    credType_0: CredentialType): __compactRuntime.CircuitResults<PS, []>;
  createPoll(context: __compactRuntime.CircuitContext<PS>,
             pollId_0: PollId,
             pollType_0: PollType,
             credType_0: CredentialType,
             optionCount_0: bigint,
             endTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  castBinaryVote(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
  castRankedVote(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
  closePoll(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerCommunity(context: __compactRuntime.CircuitContext<PS>,
                    communityId_0: Uint8Array,
                    configHash_0: Uint8Array,
                    credType_0: CredentialType): __compactRuntime.CircuitResults<PS, []>;
  createPoll(context: __compactRuntime.CircuitContext<PS>,
             pollId_0: PollId,
             pollType_0: PollType,
             credType_0: CredentialType,
             optionCount_0: bigint,
             endTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  castBinaryVote(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
  castRankedVote(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
  closePoll(context: __compactRuntime.CircuitContext<PS>, pollId_0: PollId): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly contractAdmin: AdminPublicKey;
  communities: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): CommunityOnChainConfig;
    [Symbol.iterator](): Iterator<[Uint8Array, CommunityOnChainConfig]>
  };
  polls: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: PollId): boolean;
    lookup(key_0: PollId): PollConfig;
    [Symbol.iterator](): Iterator<[PollId, PollConfig]>
  };
  readonly pollCount: bigint;
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Nullifier): boolean;
    [Symbol.iterator](): Iterator<Nullifier>
  };
  tallies: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: PollId): boolean;
    lookup(key_0: PollId): {
      isEmpty(): boolean;
      size(): bigint;
      member(key_1: bigint): boolean;
      lookup(key_1: bigint): { read(): bigint }
    }
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

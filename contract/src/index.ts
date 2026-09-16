import * as CompiledContractModule from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import { Contract } from './managed/eclipse_poll/contract/index.js';
import { witnesses } from './witnesses.js';

export * from './managed/eclipse_poll/contract/index.js';
export * from './witnesses.js';

export const CompiledEclipsePollContract = (CompiledContractModule as any).withWitnesses
  ? (CompiledContractModule as any).withWitnesses(
      (CompiledContractModule as any).make('eclipse_poll', Contract as any),
      witnesses as any,
    )
  : (CompiledContractModule as any).make('eclipse_poll', Contract as any);

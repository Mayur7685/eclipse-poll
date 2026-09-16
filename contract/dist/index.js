import * as CompiledContractModule from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import { Contract } from './managed/eclipse_poll/contract/index.js';
import { witnesses } from './witnesses.js';
export * from './managed/eclipse_poll/contract/index.js';
export * from './witnesses.js';
export const CompiledEclipsePollContract = CompiledContractModule.withWitnesses
    ? CompiledContractModule.withWitnesses(CompiledContractModule.make('eclipse_poll', Contract), witnesses)
    : CompiledContractModule.make('eclipse_poll', Contract);

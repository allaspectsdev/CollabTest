// Core pipeline
export {
  pipeline,
  stage,
  pureStage,
  tryStage,
  ok,
  err,
  pipelineErr,
  isOk,
  isErr,
  map,
  flatMap,
  mapErr,
  unwrap,
  unwrapOr,
  fromPromise,
  ErrorCode,
  createPipelineError,
} from './pipeline/index.js';

// Middleware
export { logger, timer, retry, validator } from './middleware/index.js';

// Events
export { PipelineEventEmitter } from './events/index.js';

// Types
export type {
  Pipeline,
  StageDefinition,
  PipelineContext,
  Middleware,
  NextFn,
  Result,
  Ok,
  Err,
  PipelineError,
} from './pipeline/index.js';

export type {
  LoggerOptions,
  TimerOptions,
  RetryOptions,
  ValidatorOptions,
} from './middleware/index.js';

export type { PipelineEvents, StageEvent } from './events/index.js';

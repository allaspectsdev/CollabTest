import type { StageDefinition, PipelineContext, Result } from './types.js';
import { ok, err } from './result.js';
import { createPipelineError, ErrorCode } from './errors.js';

export function stage<A, B>(
  name: string,
  execute: (input: A, ctx: PipelineContext) => Promise<Result<B>>,
): StageDefinition<A, B> {
  return { name, execute };
}

export function pureStage<A, B>(
  name: string,
  fn: (input: A) => B | Promise<B>,
): StageDefinition<A, B> {
  return {
    name,
    execute: async (input: A) => {
      const result = await fn(input);
      return ok(result);
    },
  };
}

export function tryStage<A, B>(
  name: string,
  fn: (input: A, ctx: PipelineContext) => B | Promise<B>,
): StageDefinition<A, B> {
  return {
    name,
    execute: async (input: A, ctx: PipelineContext) => {
      try {
        const result = await fn(input, ctx);
        return ok(result);
      } catch (e) {
        return err(
          createPipelineError(
            ErrorCode.STAGE_EXECUTION_FAILED,
            e instanceof Error ? e.message : String(e),
            { cause: e, stage: name },
          ),
        );
      }
    },
  };
}

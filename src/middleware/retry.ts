import type { Middleware, NextFn, PipelineError, Result, StageDefinition } from '../pipeline/types.js';
import type { RetryOptions } from './types.js';
import { isOk, err } from '../pipeline/result.js';
import { createPipelineError, ErrorCode } from '../pipeline/errors.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retry(options?: RetryOptions): Middleware {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delayMs = options?.delayMs ?? 100;
  const backoffMultiplier = options?.backoffMultiplier ?? 2;
  const retryOn = options?.retryOn;
  const onRetry = options?.onRetry;

  return <A, B>(stage: StageDefinition<A, B>, next: NextFn<A, B>): NextFn<A, B> => {
    return async (input, ctx) => {
      let lastError: PipelineError | undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = await next(input, ctx);

        if (isOk(result)) {
          return result;
        }

        lastError = result.error as PipelineError;

        // Check if we should retry this error
        if (retryOn && !retryOn(lastError)) {
          return result;
        }

        // Don't delay after the last attempt
        if (attempt < maxAttempts) {
          onRetry?.({
            attempt,
            maxAttempts,
            error: lastError,
            stageName: stage.name,
          });

          const currentDelay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
          await delay(currentDelay);
        }
      }

      return err(
        createPipelineError(ErrorCode.RETRY_EXHAUSTED, `Stage "${stage.name}" failed after ${maxAttempts} attempts: ${lastError?.message ?? 'unknown error'}`, {
          cause: lastError,
          stage: stage.name,
        }),
      ) as Result<B>;
    };
  };
}

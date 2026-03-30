import type { Middleware, NextFn, StageDefinition } from '../pipeline/types.js';
import type { TimerOptions } from './types.js';

export function timer(options?: TimerOptions): Middleware {
  const warnThresholdMs = options?.warnThresholdMs;
  const warnFn = options?.warnFn ?? console.warn;

  return <A, B>(stage: StageDefinition<A, B>, next: NextFn<A, B>): NextFn<A, B> => {
    return async (input, ctx) => {
      const start = performance.now();
      const result = await next(input, ctx);
      const durationMs = performance.now() - start;

      ctx.set(`stage:${stage.name}:durationMs`, durationMs);

      if (warnThresholdMs !== undefined && durationMs > warnThresholdMs) {
        warnFn(
          `[pipeline] Stage "${stage.name}" exceeded threshold: ${durationMs.toFixed(1)}ms > ${warnThresholdMs}ms`,
        );
      }

      return result;
    };
  };
}

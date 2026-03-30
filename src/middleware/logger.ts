import type { Middleware, NextFn, StageDefinition } from '../pipeline/types.js';
import type { LoggerOptions } from './types.js';
import { isOk } from '../pipeline/result.js';

export function logger(options?: LoggerOptions): Middleware {
  const logFn = options?.logFn ?? console.log;
  const logInput = options?.logInput ?? false;
  const logOutput = options?.logOutput ?? false;

  return <A, B>(stage: StageDefinition<A, B>, next: NextFn<A, B>): NextFn<A, B> => {
    return async (input, ctx) => {
      const inputMsg = logInput ? ` | input: ${JSON.stringify(input)}` : '';
      logFn(`[pipeline] Stage "${stage.name}" started${inputMsg}`);

      const result = await next(input, ctx);

      if (isOk(result)) {
        const outputMsg = logOutput ? ` | output: ${JSON.stringify(result.value)}` : '';
        logFn(`[pipeline] Stage "${stage.name}" completed (ok)${outputMsg}`);
      } else {
        logFn(`[pipeline] Stage "${stage.name}" failed: ${result.error.message}`);
      }

      return result;
    };
  };
}

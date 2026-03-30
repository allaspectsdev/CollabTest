import type { Middleware, NextFn, Result, StageDefinition } from '../pipeline/types.js';
import type { ValidatorOptions } from './types.js';
import { isOk, isErr } from '../pipeline/result.js';

export function validator(options: ValidatorOptions): Middleware {
  return <A, B>(stage: StageDefinition<A, B>, next: NextFn<A, B>): NextFn<A, B> => {
    return async (input, ctx) => {
      // Validate input if schema provided
      if (options.inputSchema) {
        const inputResult = options.inputSchema(input as unknown);
        if (isErr(inputResult)) {
          return inputResult as Result<B>;
        }
        input = inputResult.value as A;
      }

      // Execute the stage
      const result = await next(input, ctx);

      // Validate output if schema provided and stage succeeded
      if (isOk(result) && options.outputSchema) {
        const outputResult = options.outputSchema(result.value as unknown);
        if (isErr(outputResult)) {
          return outputResult as Result<B>;
        }
        return outputResult as Result<B>;
      }

      return result;
    };
  };
}

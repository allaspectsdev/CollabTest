import type {
  StageDefinition,
  Pipeline,
  Middleware,
  NextFn,
  Result,
  PipelineContext,
} from './types.js';
import { ok, err, isErr } from './result.js';
import { createPipelineError, ErrorCode } from './errors.js';
import { PipelineContextImpl } from './context.js';
import { PipelineEventEmitter } from '../events/emitter.js';
import type { PipelineEvents } from '../events/types.js';

export class PipelineBuilder<TInput, TCurrent> {
  private readonly _name: string;
  private readonly _stages: StageDefinition<unknown, unknown>[];
  private readonly _middleware: Middleware[];
  private readonly _emitter: PipelineEventEmitter;

  constructor(name: string) {
    this._name = name;
    this._stages = [];
    this._middleware = [];
    this._emitter = new PipelineEventEmitter();
  }

  private _clone(): PipelineBuilder<TInput, TCurrent> {
    const clone = new PipelineBuilder<TInput, TCurrent>(this._name);
    clone._stages.push(...this._stages);
    clone._middleware.push(...this._middleware);
    // Share the emitter reference so event handlers carry over
    Object.defineProperty(clone, '_emitter', { value: this._emitter });
    return clone;
  }

  pipe<TNext>(stage: StageDefinition<TCurrent, TNext>): PipelineBuilder<TInput, TNext> {
    const next = this._clone() as unknown as PipelineBuilder<TInput, TNext>;
    next._stages.push(stage as unknown as StageDefinition<unknown, unknown>);
    return next;
  }

  use(middleware: Middleware): PipelineBuilder<TInput, TCurrent> {
    const next = this._clone();
    next._middleware.push(middleware);
    return next;
  }

  compose<TNext>(pipeline: Pipeline<TCurrent, TNext>): PipelineBuilder<TInput, TNext> {
    const composedStage: StageDefinition<TCurrent, TNext> = {
      name: `[${pipeline.name}]`,
      execute: async (input: TCurrent) => {
        return pipeline.execute(input);
      },
    };
    return this.pipe(composedStage);
  }

  tap(
    name: string,
    fn: (value: TCurrent, ctx: PipelineContext) => void | Promise<void>,
  ): PipelineBuilder<TInput, TCurrent> {
    const tapStage: StageDefinition<TCurrent, TCurrent> = {
      name,
      execute: async (input: TCurrent, ctx: PipelineContext) => {
        await fn(input, ctx);
        return ok(input);
      },
    };
    return this.pipe(tapStage);
  }

  branch<TNext>(
    name: string,
    predicate: (value: TCurrent) => boolean,
    ifTrue: StageDefinition<TCurrent, TNext>,
    ifFalse: StageDefinition<TCurrent, TNext>,
  ): PipelineBuilder<TInput, TNext> {
    const branchStage: StageDefinition<TCurrent, TNext> = {
      name,
      execute: async (input: TCurrent, ctx: PipelineContext) => {
        const chosen = predicate(input) ? ifTrue : ifFalse;
        return chosen.execute(input, ctx);
      },
    };
    return this.pipe(branchStage);
  }

  on<K extends keyof PipelineEvents>(
    event: K,
    handler: PipelineEvents[K],
  ): PipelineBuilder<TInput, TCurrent> {
    this._emitter.on(event, handler);
    return this;
  }

  build(): Pipeline<TInput, TCurrent> {
    const name = this._name;
    const stages = [...this._stages];
    const middleware = [...this._middleware];
    const emitter = this._emitter;

    return {
      name,
      stages,
      execute: async (input: TInput): Promise<Result<TCurrent>> => {
        const ctx = new PipelineContextImpl(name);
        const pipelineStart = performance.now();

        emitter.emit('pipeline:start', {
          pipelineId: name,
          runId: ctx.runId,
          input,
        });

        let current: unknown = input;

        for (const stg of stages) {
          const stageStart = performance.now();

          emitter.emit('stage:start', {
            pipelineId: name,
            runId: ctx.runId,
            stageName: stg.name,
            timestamp: new Date(),
            input: current,
          });

          // Build middleware chain: outermost middleware wraps innermost
          let executor: NextFn<unknown, unknown> = (inp, c) => stg.execute(inp, c);
          for (let i = middleware.length - 1; i >= 0; i--) {
            executor = middleware[i](stg, executor);
          }

          let result: Result<unknown>;
          try {
            result = await executor(current, ctx);
          } catch (e) {
            const pipelineError = createPipelineError(
              ErrorCode.UNEXPECTED_ERROR,
              e instanceof Error ? e.message : String(e),
              { cause: e, stage: stg.name },
            );

            emitter.emit('stage:error', {
              pipelineId: name,
              runId: ctx.runId,
              stageName: stg.name,
              timestamp: new Date(),
              error: pipelineError,
            });

            emitter.emit('pipeline:error', {
              pipelineId: name,
              runId: ctx.runId,
              error: pipelineError,
            });

            return err(pipelineError) as Result<TCurrent>;
          }

          if (isErr(result)) {
            const stageDuration = performance.now() - stageStart;

            emitter.emit('stage:error', {
              pipelineId: name,
              runId: ctx.runId,
              stageName: stg.name,
              timestamp: new Date(),
              error: result.error,
            });

            emitter.emit('pipeline:error', {
              pipelineId: name,
              runId: ctx.runId,
              error: result.error,
            });

            ctx.set(`stage:${stg.name}:durationMs`, stageDuration);

            return result as Result<TCurrent>;
          }

          const stageDuration = performance.now() - stageStart;
          ctx.set(`stage:${stg.name}:durationMs`, stageDuration);

          emitter.emit('stage:complete', {
            pipelineId: name,
            runId: ctx.runId,
            stageName: stg.name,
            timestamp: new Date(),
            output: result.value,
            durationMs: stageDuration,
          });

          current = result.value;
        }

        const totalDuration = performance.now() - pipelineStart;

        emitter.emit('pipeline:complete', {
          pipelineId: name,
          runId: ctx.runId,
          output: current,
          durationMs: totalDuration,
        });

        return ok(current) as Result<TCurrent>;
      },
    };
  }
}

export function pipeline<TInput>(name: string): PipelineBuilder<TInput, TInput> {
  return new PipelineBuilder<TInput, TInput>(name);
}

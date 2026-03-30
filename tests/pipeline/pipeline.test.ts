import { describe, it, expect } from 'vitest';
import { pipeline } from '../../src/pipeline/pipeline.js';
import { pureStage, stage, tryStage } from '../../src/pipeline/stage.js';
import { ok, err, isErr } from '../../src/pipeline/result.js';
import { createPipelineError, ErrorCode } from '../../src/pipeline/errors.js';
import type { Middleware, NextFn, StageDefinition } from '../../src/pipeline/types.js';

describe('Pipeline', () => {
  describe('basic execution', () => {
    it('single-stage pipeline executes and returns Ok', async () => {
      const p = pipeline<number>('single')
        .pipe(pureStage('double', (n: number) => n * 2))
        .build();

      const result = await p.execute(5);
      expect(result).toEqual(ok(10));
    });

    it('multi-stage pipeline chains correctly', async () => {
      const p = pipeline<string>('multi')
        .pipe(pureStage('trim', (s: string) => s.trim()))
        .pipe(pureStage('parse', (s: string) => parseInt(s, 10)))
        .pipe(pureStage('double', (n: number) => n * 2))
        .build();

      const result = await p.execute('  21  ');
      expect(result).toEqual(ok(42));
    });

    it('empty pipeline returns input unchanged', async () => {
      const p = pipeline<string>('empty').build();
      const result = await p.execute('hello');
      expect(result).toEqual(ok('hello'));
    });

    it('pipeline has correct name', () => {
      const p = pipeline<string>('my-pipeline').build();
      expect(p.name).toBe('my-pipeline');
    });

    it('pipeline exposes stages list', () => {
      const s1 = pureStage('a', (x: number) => x);
      const s2 = pureStage('b', (x: number) => x);
      const p = pipeline<number>('test').pipe(s1).pipe(s2).build();
      expect(p.stages).toHaveLength(2);
      expect(p.stages[0].name).toBe('a');
      expect(p.stages[1].name).toBe('b');
    });
  });

  describe('error handling', () => {
    it('short-circuits on first Err', async () => {
      const calls: string[] = [];

      const p = pipeline<number>('short-circuit')
        .pipe(
          stage('first', async (n) => {
            calls.push('first');
            return ok(n);
          }),
        )
        .pipe(
          stage('fail', async () => {
            calls.push('fail');
            return err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'boom'));
          }),
        )
        .pipe(
          stage('never', async (n) => {
            calls.push('never');
            return ok(n);
          }),
        )
        .build();

      const result = await p.execute(1);
      expect(isErr(result)).toBe(true);
      expect(calls).toEqual(['first', 'fail']);
    });

    it('handles thrown exceptions gracefully', async () => {
      const p = pipeline<number>('throws')
        .pipe(
          tryStage('boom', () => {
            throw new Error('unexpected');
          }),
        )
        .build();

      const result = await p.execute(1);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('unexpected');
      }
    });
  });

  describe('.tap()', () => {
    it('executes side effect without changing value', async () => {
      const sideEffects: number[] = [];

      const p = pipeline<number>('tap-test')
        .pipe(pureStage('double', (n: number) => n * 2))
        .tap('log', (value) => {
          sideEffects.push(value);
        })
        .pipe(pureStage('add1', (n: number) => n + 1))
        .build();

      const result = await p.execute(5);
      expect(result).toEqual(ok(11));
      expect(sideEffects).toEqual([10]);
    });
  });

  describe('.branch()', () => {
    it('routes to ifTrue when predicate returns true', async () => {
      const p = pipeline<number>('branch-test')
        .branch(
          'sign-check',
          (n) => n > 0,
          pureStage('positive', (n: number) => `${n} is positive`),
          pureStage('non-positive', (n: number) => `${n} is non-positive`),
        )
        .build();

      const result = await p.execute(5);
      expect(result).toEqual(ok('5 is positive'));
    });

    it('routes to ifFalse when predicate returns false', async () => {
      const p = pipeline<number>('branch-test')
        .branch(
          'sign-check',
          (n) => n > 0,
          pureStage('positive', (n: number) => `${n} is positive`),
          pureStage('non-positive', (n: number) => `${n} is non-positive`),
        )
        .build();

      const result = await p.execute(-3);
      expect(result).toEqual(ok('-3 is non-positive'));
    });
  });

  describe('.compose()', () => {
    it('embeds a sub-pipeline as a stage', async () => {
      const inner = pipeline<number>('inner')
        .pipe(pureStage('add10', (n: number) => n + 10))
        .pipe(pureStage('toString', (n: number) => String(n)))
        .build();

      const outer = pipeline<number>('outer')
        .pipe(pureStage('double', (n: number) => n * 2))
        .compose(inner)
        .build();

      const result = await outer.execute(5);
      expect(result).toEqual(ok('20'));
    });
  });

  describe('.use() middleware', () => {
    it('applies middleware to all stages', async () => {
      const stageNames: string[] = [];

      const trackingMiddleware: Middleware = <A, B>(
        stg: StageDefinition<A, B>,
        next: NextFn<A, B>,
      ): NextFn<A, B> => {
        return async (input, ctx) => {
          stageNames.push(stg.name);
          return next(input, ctx);
        };
      };

      const p = pipeline<number>('mw-test')
        .use(trackingMiddleware)
        .pipe(pureStage('a', (n: number) => n + 1))
        .pipe(pureStage('b', (n: number) => n * 2))
        .build();

      await p.execute(1);
      expect(stageNames).toEqual(['a', 'b']);
    });

    it('middleware wraps in order: first added is outermost', async () => {
      const order: string[] = [];

      const mw = (label: string): Middleware => {
        return <A, B>(stg: StageDefinition<A, B>, next: NextFn<A, B>): NextFn<A, B> => {
          return async (input, ctx) => {
            order.push(`${label}:before`);
            const result = await next(input, ctx);
            order.push(`${label}:after`);
            return result;
          };
        };
      };

      const p = pipeline<number>('order-test')
        .use(mw('A'))
        .use(mw('B'))
        .pipe(pureStage('x', (n: number) => n))
        .build();

      await p.execute(1);
      expect(order).toEqual(['A:before', 'B:before', 'B:after', 'A:after']);
    });
  });

  describe('events', () => {
    it('emits pipeline:start and pipeline:complete', async () => {
      const starts: unknown[] = [];
      const completes: unknown[] = [];

      const p = pipeline<number>('events-test')
        .on('pipeline:start', (e) => starts.push(e))
        .on('pipeline:complete', (e) => completes.push(e))
        .pipe(pureStage('id', (n: number) => n))
        .build();

      await p.execute(42);
      expect(starts).toHaveLength(1);
      expect(completes).toHaveLength(1);
    });

    it('emits stage:start and stage:complete for each stage', async () => {
      const stageStarts: string[] = [];
      const stageCompletes: string[] = [];

      const p = pipeline<number>('stage-events')
        .on('stage:start', (e) => stageStarts.push(e.stageName))
        .on('stage:complete', (e) => stageCompletes.push(e.stageName))
        .pipe(pureStage('a', (n: number) => n))
        .pipe(pureStage('b', (n: number) => n))
        .build();

      await p.execute(1);
      expect(stageStarts).toEqual(['a', 'b']);
      expect(stageCompletes).toEqual(['a', 'b']);
    });

    it('emits pipeline:error on stage failure', async () => {
      const errors: unknown[] = [];

      const p = pipeline<number>('error-events')
        .on('pipeline:error', (e) => errors.push(e))
        .pipe(
          stage('fail', async () =>
            err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'oops')),
          ),
        )
        .build();

      await p.execute(1);
      expect(errors).toHaveLength(1);
    });
  });

  describe('immutability', () => {
    it('pipe() returns a new builder, does not mutate original', async () => {
      const base = pipeline<number>('base').pipe(pureStage('a', (n: number) => n + 1));
      const branch1 = base.pipe(pureStage('b', (n: number) => n * 10)).build();
      const branch2 = base.pipe(pureStage('c', (n: number) => n * 100)).build();

      expect(await branch1.execute(1)).toEqual(ok(20));
      expect(await branch2.execute(1)).toEqual(ok(200));
    });
  });
});

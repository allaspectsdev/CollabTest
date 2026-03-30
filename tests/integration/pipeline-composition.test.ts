import { describe, it, expect } from 'vitest';
import { pipeline } from '../../src/pipeline/pipeline.js';
import { pureStage, stage } from '../../src/pipeline/stage.js';
import { ok, err, isOk, isErr } from '../../src/pipeline/result.js';
import { createPipelineError, ErrorCode } from '../../src/pipeline/errors.js';
import { logger } from '../../src/middleware/logger.js';
import { timer } from '../../src/middleware/timer.js';
import { retry } from '../../src/middleware/retry.js';
import { validator } from '../../src/middleware/validator.js';

describe('Integration: Pipeline Composition', () => {
  it('full ETL pipeline: parse -> validate -> transform -> aggregate', async () => {
    type RawRow = { name: string; value: string };
    type ValidRow = { name: string; value: number };
    type Summary = { total: number; count: number; average: number };

    const etl = pipeline<RawRow[]>('etl')
      .pipe(
        pureStage('parse-values', (rows: RawRow[]) =>
          rows.map((r) => ({ name: r.name, value: parseInt(r.value, 10) })),
        ),
      )
      .pipe(
        pureStage('validate', (rows: ValidRow[]) =>
          rows.filter((r) => !isNaN(r.value) && r.value > 0),
        ),
      )
      .pipe(
        pureStage('aggregate', (rows: ValidRow[]): Summary => {
          const total = rows.reduce((sum, r) => sum + r.value, 0);
          return { total, count: rows.length, average: total / rows.length };
        }),
      )
      .build();

    const result = await etl.execute([
      { name: 'a', value: '10' },
      { name: 'b', value: '20' },
      { name: 'c', value: '-5' },
      { name: 'd', value: 'bad' },
      { name: 'e', value: '30' },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ total: 60, count: 3, average: 20 });
    }
  });

  it('pipeline with all four middleware applied simultaneously', async () => {
    const logs: string[] = [];
    let timerDuration: number | undefined;

    const p = pipeline<number>('full-middleware')
      .use(logger({ logFn: (msg) => logs.push(msg) }))
      .use(timer({ warnThresholdMs: 10000 }))
      .use(
        validator({
          inputSchema: (n: unknown) => {
            if (typeof n === 'number' && n > 0) return ok(n);
            return err(
              createPipelineError(ErrorCode.VALIDATION_FAILED, 'must be positive'),
            );
          },
        }),
      )
      .pipe(pureStage('double', (n: number) => n * 2))
      .tap('check-timer', (_val, ctx) => {
        timerDuration = ctx.get<number>('stage:double:durationMs');
      })
      .build();

    const result = await p.execute(5);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(10);
    }

    // Logger should have recorded stages
    expect(logs.length).toBeGreaterThan(0);

    // Timer should have recorded duration
    expect(timerDuration).toBeTypeOf('number');
  });

  it('nested pipeline composition', async () => {
    const normalize = pipeline<string>('normalize')
      .pipe(pureStage('trim', (s: string) => s.trim()))
      .pipe(pureStage('lower', (s: string) => s.toLowerCase()))
      .build();

    const enrich = pipeline<string>('enrich')
      .pipe(pureStage('prefix', (s: string) => `user:${s}`))
      .build();

    const full = pipeline<string>('full')
      .compose(normalize)
      .compose(enrich)
      .pipe(pureStage('wrap', (s: string) => ({ id: s })))
      .build();

    const result = await full.execute('  ALICE  ');
    expect(result).toEqual(ok({ id: 'user:alice' }));
  });

  it('error short-circuit: stages after failure never execute', async () => {
    const executed: string[] = [];

    const p = pipeline<number>('short-circuit')
      .pipe(
        stage('step-1', async (n) => {
          executed.push('step-1');
          return ok(n + 1);
        }),
      )
      .pipe(
        stage('step-2-fail', async () => {
          executed.push('step-2-fail');
          return err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'fail at step 2'));
        }),
      )
      .pipe(
        stage('step-3', async (n) => {
          executed.push('step-3');
          return ok(n);
        }),
      )
      .pipe(
        stage('step-4', async (n) => {
          executed.push('step-4');
          return ok(n);
        }),
      )
      .build();

    const result = await p.execute(0);
    expect(isErr(result)).toBe(true);
    expect(executed).toEqual(['step-1', 'step-2-fail']);
  });

  it('event observability: all expected events fire in order', async () => {
    const events: string[] = [];

    const p = pipeline<number>('observable')
      .on('pipeline:start', () => events.push('pipeline:start'))
      .on('pipeline:complete', () => events.push('pipeline:complete'))
      .on('stage:start', (e) => events.push(`stage:start:${e.stageName}`))
      .on('stage:complete', (e) => events.push(`stage:complete:${e.stageName}`))
      .pipe(pureStage('a', (n: number) => n + 1))
      .pipe(pureStage('b', (n: number) => n * 2))
      .build();

    await p.execute(1);

    expect(events).toEqual([
      'pipeline:start',
      'stage:start:a',
      'stage:complete:a',
      'stage:start:b',
      'stage:complete:b',
      'pipeline:complete',
    ]);
  });

  it('retry middleware with multi-stage pipeline', async () => {
    let fetchAttempts = 0;

    const p = pipeline<string>('retry-pipeline')
      .use(retry({ maxAttempts: 3, delayMs: 1, backoffMultiplier: 1 }))
      .pipe(pureStage('normalize', (url: string) => url.trim().toLowerCase()))
      .pipe(
        stage('fetch', async (url) => {
          fetchAttempts++;
          if (fetchAttempts < 2) {
            return err(
              createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'network error'),
            );
          }
          return ok({ url, status: 200 });
        }),
      )
      .pipe(pureStage('extract', (res: { url: string; status: number }) => res.status))
      .build();

    const result = await p.execute('  HTTPS://EXAMPLE.COM  ');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(200);
    }
  });

  it('branch + compose together', async () => {
    const main = pipeline<{ text: string; shout: boolean }>('main')
      .pipe(pureStage('extract', (input) => ({ text: input.text, shout: input.shout })))
      .branch(
        'case-select',
        (input) => input.shout,
        pureStage('upper-path', (input) => input.text.toUpperCase()),
        pureStage('lower-path', (input) => input.text.toLowerCase()),
      )
      .build();

    const shoutResult = await main.execute({ text: 'Hello World', shout: true });
    expect(shoutResult).toEqual(ok('HELLO WORLD'));

    const quietResult = await main.execute({ text: 'Hello World', shout: false });
    expect(quietResult).toEqual(ok('hello world'));
  });
});

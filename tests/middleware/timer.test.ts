import { describe, it, expect, vi } from 'vitest';
import { timer } from '../../src/middleware/timer.js';
import { pipeline } from '../../src/pipeline/pipeline.js';
import { pureStage } from '../../src/pipeline/stage.js';


describe('timer middleware', () => {
  it('records duration in context metadata', async () => {
    // We can't directly access context from outside, but we can verify
    // through a tap that reads the metadata
    let duration: number | undefined;

    const p = pipeline<number>('timer-test')
      .use(timer())
      .pipe(pureStage('work', (n: number) => n * 2))
      .tap('check-duration', (_val, ctx) => {
        duration = ctx.get<number>('stage:work:durationMs');
      })
      .build();

    await p.execute(5);
    expect(duration).toBeTypeOf('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('does not warn when under threshold', async () => {
    const warnFn = vi.fn();

    const p = pipeline<number>('no-warn')
      .use(timer({ warnThresholdMs: 10000, warnFn }))
      .pipe(pureStage('fast', (n: number) => n))
      .build();

    await p.execute(1);
    expect(warnFn).not.toHaveBeenCalled();
  });

  it('warns when exceeding threshold', async () => {
    const warnFn = vi.fn();

    const p = pipeline<number>('warn-test')
      .use(timer({ warnThresholdMs: 0, warnFn })) // threshold of 0 = always warns
      .pipe(pureStage('any', (n: number) => n))
      .build();

    await p.execute(1);
    expect(warnFn).toHaveBeenCalled();
    expect(warnFn.mock.calls[0][0]).toContain('exceeded threshold');
  });

  it('uses console.warn by default', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const p = pipeline<number>('default-warn')
      .use(timer({ warnThresholdMs: 0 }))
      .pipe(pureStage('any', (n: number) => n))
      .build();

    await p.execute(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('records durations for multiple stages independently', async () => {
    let durationA: number | undefined;
    let durationB: number | undefined;

    const p = pipeline<number>('multi-timer')
      .use(timer())
      .pipe(pureStage('a', (n: number) => n + 1))
      .pipe(pureStage('b', (n: number) => n * 2))
      .tap('check', (_val, ctx) => {
        durationA = ctx.get<number>('stage:a:durationMs');
        durationB = ctx.get<number>('stage:b:durationMs');
      })
      .build();

    await p.execute(1);
    expect(durationA).toBeTypeOf('number');
    expect(durationB).toBeTypeOf('number');
  });
});

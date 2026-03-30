import { describe, it, expect, vi } from 'vitest';
import { logger } from '../../src/middleware/logger.js';
import { pipeline } from '../../src/pipeline/pipeline.js';
import { pureStage, stage } from '../../src/pipeline/stage.js';
import { err } from '../../src/pipeline/result.js';
import { createPipelineError, ErrorCode } from '../../src/pipeline/errors.js';

describe('logger middleware', () => {
  it('logs stage start and completion', async () => {
    const logs: string[] = [];

    const p = pipeline<number>('log-test')
      .use(logger({ logFn: (msg) => logs.push(msg) }))
      .pipe(pureStage('double', (n: number) => n * 2))
      .build();

    await p.execute(5);
    expect(logs).toEqual([
      '[pipeline] Stage "double" started',
      '[pipeline] Stage "double" completed (ok)',
    ]);
  });

  it('logs stage failure', async () => {
    const logs: string[] = [];

    const p = pipeline<number>('fail-log')
      .use(logger({ logFn: (msg) => logs.push(msg) }))
      .pipe(
        stage('bad', async () =>
          err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'broke')),
        ),
      )
      .build();

    await p.execute(1);
    expect(logs[1]).toBe('[pipeline] Stage "bad" failed: broke');
  });

  it('does not log input/output by default', async () => {
    const logs: string[] = [];

    const p = pipeline<number>('no-io')
      .use(logger({ logFn: (msg) => logs.push(msg) }))
      .pipe(pureStage('id', (n: number) => n))
      .build();

    await p.execute(42);
    expect(logs[0]).not.toContain('input');
    expect(logs[1]).not.toContain('output');
  });

  it('logs input when logInput is true', async () => {
    const logs: string[] = [];

    const p = pipeline<number>('log-input')
      .use(logger({ logFn: (msg) => logs.push(msg), logInput: true }))
      .pipe(pureStage('id', (n: number) => n))
      .build();

    await p.execute(42);
    expect(logs[0]).toContain('input: 42');
  });

  it('logs output when logOutput is true', async () => {
    const logs: string[] = [];

    const p = pipeline<number>('log-output')
      .use(logger({ logFn: (msg) => logs.push(msg), logOutput: true }))
      .pipe(pureStage('double', (n: number) => n * 2))
      .build();

    await p.execute(5);
    expect(logs[1]).toContain('output: 10');
  });

  it('uses console.log by default', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const p = pipeline<number>('console-log')
      .use(logger())
      .pipe(pureStage('id', (n: number) => n))
      .build();

    await p.execute(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs for each stage in a multi-stage pipeline', async () => {
    const logs: string[] = [];

    const p = pipeline<number>('multi')
      .use(logger({ logFn: (msg) => logs.push(msg) }))
      .pipe(pureStage('a', (n: number) => n + 1))
      .pipe(pureStage('b', (n: number) => n * 2))
      .build();

    await p.execute(1);
    expect(logs).toHaveLength(4);
    expect(logs[0]).toContain('Stage "a" started');
    expect(logs[2]).toContain('Stage "b" started');
  });
});

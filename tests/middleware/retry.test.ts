import { describe, it, expect } from 'vitest';
import { retry } from '../../src/middleware/retry.js';
import { pipeline } from '../../src/pipeline/pipeline.js';
import { stage } from '../../src/pipeline/stage.js';
import { ok, err, isOk, isErr } from '../../src/pipeline/result.js';
import { createPipelineError, ErrorCode } from '../../src/pipeline/errors.js';

describe('retry middleware', () => {
  it('returns Ok immediately on success', async () => {
    const p = pipeline<number>('no-retry')
      .use(retry({ maxAttempts: 3 }))
      .pipe(stage('ok-stage', async (n) => ok(n * 2)))
      .build();

    const result = await p.execute(5);
    expect(result).toEqual(ok(10));
  });

  it('retries on failure and succeeds on later attempt', async () => {
    let attempts = 0;

    const p = pipeline<number>('retry-success')
      .use(retry({ maxAttempts: 3, delayMs: 1, backoffMultiplier: 1 }))
      .pipe(
        stage('flaky', async (n) => {
          attempts++;
          if (attempts < 3) {
            return err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, `attempt ${attempts}`));
          }
          return ok(n);
        }),
      )
      .build();

    const result = await p.execute(42);
    expect(isOk(result)).toBe(true);
    expect(attempts).toBe(3);
  });

  it('returns last error after all retries exhausted', async () => {
    const p = pipeline<number>('exhaust')
      .use(retry({ maxAttempts: 2, delayMs: 1, backoffMultiplier: 1 }))
      .pipe(
        stage('always-fail', async () =>
          err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'nope')),
        ),
      )
      .build();

    const result = await p.execute(1);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.RETRY_EXHAUSTED);
      expect(result.error.message).toContain('2 attempts');
    }
  });

  it('respects retryOn filter — skips retry for non-matching errors', async () => {
    let attempts = 0;

    const p = pipeline<number>('filtered')
      .use(
        retry({
          maxAttempts: 3,
          delayMs: 1,
          retryOn: (e) => e.code === 'RETRYABLE',
        }),
      )
      .pipe(
        stage('non-retryable', async () => {
          attempts++;
          return err(createPipelineError(ErrorCode.VALIDATION_FAILED, 'bad input'));
        }),
      )
      .build();

    const result = await p.execute(1);
    expect(attempts).toBe(1); // No retry
    expect(isErr(result)).toBe(true);
  });

  it('retryOn filter allows matching errors to retry', async () => {
    let attempts = 0;

    const p = pipeline<number>('filtered-match')
      .use(
        retry({
          maxAttempts: 3,
          delayMs: 1,
          backoffMultiplier: 1,
          retryOn: (e) => e.code === ErrorCode.STAGE_EXECUTION_FAILED,
        }),
      )
      .pipe(
        stage('retryable', async (n) => {
          attempts++;
          if (attempts < 3) {
            return err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'retry me'));
          }
          return ok(n);
        }),
      )
      .build();

    const result = await p.execute(1);
    expect(isOk(result)).toBe(true);
    expect(attempts).toBe(3);
  });

  it('calls onRetry callback between attempts', async () => {
    const retryEvents: Array<{ attempt: number; stageName: string }> = [];

    const p = pipeline<number>('on-retry')
      .use(
        retry({
          maxAttempts: 3,
          delayMs: 1,
          backoffMultiplier: 1,
          onRetry: (e) => retryEvents.push({ attempt: e.attempt, stageName: e.stageName }),
        }),
      )
      .pipe(
        stage('fail-twice', async () =>
          err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'fail')),
        ),
      )
      .build();

    await p.execute(1);
    // onRetry fires between attempts 1->2 and 2->3
    expect(retryEvents).toHaveLength(2);
    expect(retryEvents[0]).toEqual({ attempt: 1, stageName: 'fail-twice' });
    expect(retryEvents[1]).toEqual({ attempt: 2, stageName: 'fail-twice' });
  });

  it('defaults to 3 max attempts', async () => {
    let attempts = 0;

    const p = pipeline<number>('default-attempts')
      .use(retry({ delayMs: 1, backoffMultiplier: 1 }))
      .pipe(
        stage('counter', async () => {
          attempts++;
          return err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'fail'));
        }),
      )
      .build();

    await p.execute(1);
    expect(attempts).toBe(3);
  });

  it('applies exponential backoff', async () => {
    const timestamps: number[] = [];

    const p = pipeline<number>('backoff')
      .use(retry({ maxAttempts: 3, delayMs: 50, backoffMultiplier: 2 }))
      .pipe(
        stage('timed', async () => {
          timestamps.push(performance.now());
          return err(createPipelineError(ErrorCode.STAGE_EXECUTION_FAILED, 'fail'));
        }),
      )
      .build();

    await p.execute(1);
    expect(timestamps).toHaveLength(3);

    // First delay should be ~50ms, second ~100ms
    const delay1 = timestamps[1] - timestamps[0];
    const delay2 = timestamps[2] - timestamps[1];

    expect(delay1).toBeGreaterThanOrEqual(30); // Allow some tolerance
    expect(delay2).toBeGreaterThanOrEqual(60);
  });
});

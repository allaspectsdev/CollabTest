import { describe, it, expect, vi } from 'vitest';
import { validator } from '../../src/middleware/validator.js';
import { pipeline } from '../../src/pipeline/pipeline.js';
import { pureStage } from '../../src/pipeline/stage.js';
import { ok, isOk, isErr, pipelineErr } from '../../src/pipeline/result.js';
import { ErrorCode } from '../../src/pipeline/errors.js';

describe('validator middleware', () => {
  it('valid input passes through to stage', async () => {
    const p = pipeline<number>('valid-input')
      .use(
        validator({
          inputSchema: (n: unknown) => {
            if (typeof n === 'number' && n > 0) return ok(n);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'must be positive');
          },
        }),
      )
      .pipe(pureStage('double', (n: number) => n * 2))
      .build();

    const result = await p.execute(5);
    expect(result).toEqual(ok(10));
  });

  it('invalid input short-circuits before stage execution', async () => {
    const stageCalled = vi.fn();

    const p = pipeline<number>('invalid-input')
      .use(
        validator({
          inputSchema: (n: unknown) => {
            if (typeof n === 'number' && n > 0) return ok(n);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'must be positive');
          },
        }),
      )
      .pipe(
        pureStage('should-not-run', (n: number) => {
          stageCalled();
          return n;
        }),
      )
      .build();

    const result = await p.execute(-1);
    expect(isErr(result)).toBe(true);
    expect(stageCalled).not.toHaveBeenCalled();
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    }
  });

  it('valid output passes through', async () => {
    const p = pipeline<number>('valid-output')
      .use(
        validator({
          outputSchema: (n: unknown) => {
            if (typeof n === 'number') return ok(n);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'must be number');
          },
        }),
      )
      .pipe(pureStage('double', (n: number) => n * 2))
      .build();

    const result = await p.execute(5);
    expect(result).toEqual(ok(10));
  });

  it('invalid output returns validation Err', async () => {
    const p = pipeline<string>('invalid-output')
      .use(
        validator({
          outputSchema: (val: unknown) => {
            if (typeof val === 'string' && val.length > 0) return ok(val);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'must be non-empty string');
          },
        }),
      )
      .pipe(pureStage('empty', () => ''))
      .build();

    const result = await p.execute('hello');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    }
  });

  it('works with only outputSchema (no inputSchema)', async () => {
    const p = pipeline<number>('output-only')
      .use(
        validator({
          outputSchema: (n: unknown) => {
            if (typeof n === 'number' && n < 100) return ok(n);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'must be < 100');
          },
        }),
      )
      .pipe(pureStage('multiply', (n: number) => n * 50))
      .build();

    const okResult = await p.execute(1);
    expect(isOk(okResult)).toBe(true);

    const errResult = await p.execute(3);
    expect(isErr(errResult)).toBe(true);
  });

  it('works with only inputSchema (no outputSchema)', async () => {
    const p = pipeline<number>('input-only')
      .use(
        validator({
          inputSchema: (n: unknown) => {
            if (typeof n === 'number' && Number.isFinite(n)) return ok(n);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'must be finite number');
          },
        }),
      )
      .pipe(pureStage('double', (n: number) => n * 2))
      .build();

    const result = await p.execute(5);
    expect(result).toEqual(ok(10));
  });

  it('validates both input and output when both schemas provided', async () => {
    const p = pipeline<number>('both-schemas')
      .use(
        validator({
          inputSchema: (n: unknown) => {
            if (typeof n === 'number' && n > 0) return ok(n);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'input must be positive');
          },
          outputSchema: (n: unknown) => {
            if (typeof n === 'number' && n < 100) return ok(n);
            return pipelineErr(ErrorCode.VALIDATION_FAILED, 'output must be < 100');
          },
        }),
      )
      .pipe(pureStage('multiply', (n: number) => n * 10))
      .build();

    // Input valid, output valid
    expect(isOk(await p.execute(5))).toBe(true);
    // Input valid, output invalid
    expect(isErr(await p.execute(20))).toBe(true);
    // Input invalid
    expect(isErr(await p.execute(-1))).toBe(true);
  });
});

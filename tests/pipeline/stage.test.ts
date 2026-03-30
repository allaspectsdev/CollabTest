import { describe, it, expect } from 'vitest';
import { stage, pureStage, tryStage } from '../../src/pipeline/stage.js';
import { ok, isOk, isErr } from '../../src/pipeline/result.js';
import { PipelineContextImpl } from '../../src/pipeline/context.js';
import { ErrorCode } from '../../src/pipeline/errors.js';

function makeCtx() {
  return new PipelineContextImpl('test-pipeline');
}

describe('stage()', () => {
  it('creates a StageDefinition with correct name', () => {
    const s = stage('my-stage', async () => ok(42));
    expect(s.name).toBe('my-stage');
  });

  it('executes and returns the Result', async () => {
    const s = stage<number, string>('to-string', async (n) => ok(String(n)));
    const result = await s.execute(42, makeCtx());
    expect(result).toEqual(ok('42'));
  });

  it('receives context', async () => {
    const s = stage<string, string>('ctx-test', async (input, ctx) => {
      ctx.set('seen', true);
      return ok(input);
    });
    const ctx = makeCtx();
    await s.execute('hello', ctx);
    expect(ctx.get('seen')).toBe(true);
  });
});

describe('pureStage()', () => {
  it('wraps sync return value in Ok', async () => {
    const s = pureStage('double', (n: number) => n * 2);
    const result = await s.execute(5, makeCtx());
    expect(result).toEqual(ok(10));
  });

  it('wraps async return value in Ok', async () => {
    const s = pureStage('async-double', async (n: number) => n * 2);
    const result = await s.execute(5, makeCtx());
    expect(result).toEqual(ok(10));
  });

  it('has the correct name', () => {
    const s = pureStage('my-pure', (x: string) => x);
    expect(s.name).toBe('my-pure');
  });
});

describe('tryStage()', () => {
  it('returns Ok on success', async () => {
    const s = tryStage('parse', (input: string) => JSON.parse(input));
    const result = await s.execute('{"a":1}', makeCtx());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ a: 1 });
    }
  });

  it('catches thrown errors into Err', async () => {
    const s = tryStage('bad-parse', (input: string) => JSON.parse(input));
    const result = await s.execute('not-json', makeCtx());
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STAGE_EXECUTION_FAILED);
      expect(result.error.stage).toBe('bad-parse');
    }
  });

  it('catches async thrown errors', async () => {
    const s = tryStage('async-fail', async () => {
      throw new Error('async boom');
    });
    const result = await s.execute(null, makeCtx());
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('async boom');
    }
  });

  it('receives context', async () => {
    const s = tryStage<string, string>('ctx-try', (input, ctx) => {
      ctx.set('visited', true);
      return input.toUpperCase();
    });
    const ctx = makeCtx();
    await s.execute('hello', ctx);
    expect(ctx.get('visited')).toBe(true);
  });
});

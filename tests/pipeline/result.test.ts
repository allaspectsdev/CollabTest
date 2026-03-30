import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  pipelineErr,
  isOk,
  isErr,
  map,
  flatMap,
  mapErr,
  unwrap,
  unwrapOr,
  fromPromise,
} from '../../src/pipeline/result.js';
import { ErrorCode } from '../../src/pipeline/errors.js';

describe('Result', () => {
  describe('ok()', () => {
    it('creates an Ok variant', () => {
      const result = ok(42);
      expect(result).toEqual({ ok: true, value: 42 });
    });

    it('works with complex values', () => {
      const result = ok({ name: 'test', items: [1, 2, 3] });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ name: 'test', items: [1, 2, 3] });
    });
  });

  describe('err()', () => {
    it('creates an Err variant', () => {
      const result = err('something went wrong');
      expect(result).toEqual({ ok: false, error: 'something went wrong' });
    });
  });

  describe('pipelineErr()', () => {
    it('creates an Err with a PipelineError', () => {
      const result = pipelineErr('TEST_CODE', 'test message');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('TEST_CODE');
      expect(result.error.message).toBe('test message');
      expect(result.error.timestamp).toBeInstanceOf(Date);
    });

    it('includes cause and stage when provided', () => {
      const cause = new Error('root');
      const result = pipelineErr('CODE', 'msg', { cause, stage: 'myStage' });
      expect(result.error.cause).toBe(cause);
      expect(result.error.stage).toBe('myStage');
    });
  });

  describe('isOk() / isErr()', () => {
    it('isOk returns true for Ok', () => {
      expect(isOk(ok(1))).toBe(true);
    });

    it('isOk returns false for Err', () => {
      expect(isOk(err('fail'))).toBe(false);
    });

    it('isErr returns true for Err', () => {
      expect(isErr(err('fail'))).toBe(true);
    });

    it('isErr returns false for Ok', () => {
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe('map()', () => {
    it('transforms Ok value', () => {
      const result = map(ok(2), (n) => n * 3);
      expect(result).toEqual(ok(6));
    });

    it('passes Err through unchanged', () => {
      const original = err('fail');
      const result = map(original, (n: number) => n * 3);
      expect(result).toBe(original);
    });
  });

  describe('flatMap()', () => {
    it('chains Ok results', () => {
      const result = flatMap(ok(10), (n) => ok(n + 5));
      expect(result).toEqual(ok(15));
    });

    it('short-circuits on inner Err', () => {
      const result = flatMap(ok(10), () => err('inner fail'));
      expect(result).toEqual(err('inner fail'));
    });

    it('passes outer Err through', () => {
      const original = err('outer fail');
      const result = flatMap(original, (n: number) => ok(n + 5));
      expect(result).toBe(original);
    });
  });

  describe('mapErr()', () => {
    it('transforms the error', () => {
      const result = mapErr(err('oops'), (e) => `wrapped: ${e}`);
      expect(result).toEqual(err('wrapped: oops'));
    });

    it('passes Ok through unchanged', () => {
      const original = ok(42);
      const result = mapErr(original, (e) => `wrapped: ${e}`);
      expect(result).toBe(original);
    });
  });

  describe('unwrap()', () => {
    it('returns value for Ok', () => {
      expect(unwrap(ok('hello'))).toBe('hello');
    });

    it('throws for Err', () => {
      const result = pipelineErr('CODE', 'bad thing');
      expect(() => unwrap(result)).toThrow('Called unwrap on an Err: bad thing');
    });
  });

  describe('unwrapOr()', () => {
    it('returns value for Ok', () => {
      expect(unwrapOr(ok(10), 0)).toBe(10);
    });

    it('returns fallback for Err', () => {
      expect(unwrapOr(pipelineErr('CODE', 'fail'), 99)).toBe(99);
    });
  });

  describe('fromPromise()', () => {
    it('converts resolved promise to Ok', async () => {
      const result = await fromPromise(Promise.resolve(42));
      expect(result).toEqual(ok(42));
    });

    it('converts rejected promise to Err', async () => {
      const result = await fromPromise(Promise.reject(new Error('boom')));
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCode.UNEXPECTED_ERROR);
        expect(result.error.message).toBe('boom');
      }
    });

    it('uses custom error mapper when provided', async () => {
      const result = await fromPromise(
        Promise.reject(new Error('custom')),
        (e) => ({
          code: 'CUSTOM',
          message: (e as Error).message,
          timestamp: new Date(),
        }),
      );
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('CUSTOM');
      }
    });

    it('handles non-Error rejections', async () => {
      const result = await fromPromise(Promise.reject('string error'));
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('string error');
      }
    });
  });
});

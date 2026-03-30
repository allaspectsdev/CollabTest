import type { Ok, Err, Result, PipelineError } from './types.js';
import { createPipelineError, ErrorCode } from './errors.js';

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export function pipelineErr(
  code: string,
  message: string,
  opts?: { cause?: unknown; stage?: string },
): Err<PipelineError> {
  return err(createPipelineError(code, message, opts));
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

export function unwrap<T>(result: Result<T>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Called unwrap on an Err: ${result.error.message}`);
}

export function unwrapOr<T>(result: Result<T>, fallback: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return fallback;
}

export async function fromPromise<T>(
  promise: Promise<T>,
  errorMapper?: (e: unknown) => PipelineError,
): Promise<Result<T>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    if (errorMapper) {
      return err(errorMapper(e));
    }
    return err(
      createPipelineError(
        ErrorCode.UNEXPECTED_ERROR,
        e instanceof Error ? e.message : String(e),
        { cause: e },
      ),
    );
  }
}

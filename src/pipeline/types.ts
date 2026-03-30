/**
 * Core type definitions for the pipeline framework.
 */

// ── Result Type (Discriminated Union) ──────────────────────────────────────

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E = PipelineError> = Ok<T> | Err<E>;

// ── Pipeline Error ─────────────────────────────────────────────────────────

export interface PipelineError {
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
  readonly stage?: string;
  readonly timestamp: Date;
}

// ── Stage ──────────────────────────────────────────────────────────────────

export interface StageDefinition<A, B> {
  readonly name: string;
  readonly execute: (input: A, context: PipelineContext) => Promise<Result<B>>;
}

// ── Pipeline Context ───────────────────────────────────────────────────────

export interface PipelineContext {
  readonly pipelineId: string;
  readonly runId: string;
  readonly metadata: Map<string, unknown>;
  readonly startedAt: Date;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

// ── Middleware ──────────────────────────────────────────────────────────────

export type NextFn<A, B> = (input: A, context: PipelineContext) => Promise<Result<B>>;

export type Middleware = <A, B>(
  stage: StageDefinition<A, B>,
  next: NextFn<A, B>,
) => NextFn<A, B>;

// ── Pipeline ───────────────────────────────────────────────────────────────

export interface Pipeline<TInput, TOutput> {
  readonly name: string;
  readonly stages: ReadonlyArray<StageDefinition<unknown, unknown>>;
  execute(input: TInput): Promise<Result<TOutput>>;
}

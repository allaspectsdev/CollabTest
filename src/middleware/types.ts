import type { Result, PipelineError } from '../pipeline/types.js';

export interface LoggerOptions {
  logFn?: (message: string) => void;
  logInput?: boolean;
  logOutput?: boolean;
}

export interface TimerOptions {
  warnThresholdMs?: number;
  warnFn?: (message: string) => void;
}

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryOn?: (error: PipelineError) => boolean;
  onRetry?: (event: { attempt: number; maxAttempts: number; error: unknown; stageName: string }) => void;
}

export interface ValidatorOptions<A = unknown, B = unknown> {
  inputSchema?: (input: A) => Result<A>;
  outputSchema?: (output: B) => Result<B>;
}

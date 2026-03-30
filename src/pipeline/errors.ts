import type { PipelineError } from './types.js';

export const ErrorCode = {
  STAGE_EXECUTION_FAILED: 'STAGE_EXECUTION_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  PIPELINE_ABORTED: 'PIPELINE_ABORTED',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export function createPipelineError(
  code: string,
  message: string,
  opts?: { cause?: unknown; stage?: string },
): PipelineError {
  return {
    code,
    message,
    cause: opts?.cause,
    stage: opts?.stage,
    timestamp: new Date(),
  };
}

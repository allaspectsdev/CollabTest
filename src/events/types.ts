import type { PipelineError } from '../pipeline/types.js';

export interface StageEvent {
  pipelineId: string;
  runId: string;
  stageName: string;
  timestamp: Date;
}

export interface PipelineEvents {
  'pipeline:start': (event: { pipelineId: string; runId: string; input: unknown }) => void;
  'pipeline:complete': (event: {
    pipelineId: string;
    runId: string;
    output: unknown;
    durationMs: number;
  }) => void;
  'pipeline:error': (event: {
    pipelineId: string;
    runId: string;
    error: PipelineError;
  }) => void;
  'stage:start': (event: StageEvent & { input: unknown }) => void;
  'stage:complete': (event: StageEvent & { output: unknown; durationMs: number }) => void;
  'stage:error': (event: StageEvent & { error: PipelineError }) => void;
  'middleware:retry': (event: StageEvent & { attempt: number; maxAttempts: number; error: unknown }) => void;
}

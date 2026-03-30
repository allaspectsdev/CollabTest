import { randomUUID } from 'node:crypto';
import type { PipelineContext } from './types.js';

export class PipelineContextImpl implements PipelineContext {
  readonly pipelineId: string;
  readonly runId: string;
  readonly metadata: Map<string, unknown>;
  readonly startedAt: Date;

  constructor(pipelineId: string) {
    this.pipelineId = pipelineId;
    this.runId = randomUUID();
    this.metadata = new Map();
    this.startedAt = new Date();
  }

  get<T>(key: string): T | undefined {
    return this.metadata.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.metadata.set(key, value);
  }
}

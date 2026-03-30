import type { PipelineEvents } from './types.js';

type Handler = (...args: unknown[]) => void;

export class PipelineEventEmitter {
  private handlers = new Map<string, Set<Handler>>();

  on<K extends keyof PipelineEvents>(event: K, handler: PipelineEvents[K]): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as Handler);
  }

  off<K extends keyof PipelineEvents>(event: K, handler: PipelineEvents[K]): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as Handler);
    }
  }

  emit<K extends keyof PipelineEvents>(
    event: K,
    ...args: Parameters<PipelineEvents[K]>
  ): void {
    const set = this.handlers.get(event);
    if (set) {
      for (const handler of set) {
        handler(...args);
      }
    }
  }
}

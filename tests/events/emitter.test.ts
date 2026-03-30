import { describe, it, expect, vi } from 'vitest';
import { PipelineEventEmitter } from '../../src/events/emitter.js';

describe('PipelineEventEmitter', () => {
  it('on() registers a handler and emit() calls it', () => {
    const emitter = new PipelineEventEmitter();
    const handler = vi.fn();
    emitter.on('pipeline:start', handler);
    emitter.emit('pipeline:start', { pipelineId: 'p', runId: 'r', input: 'x' });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ pipelineId: 'p', runId: 'r', input: 'x' });
  });

  it('multiple handlers fire for the same event', () => {
    const emitter = new PipelineEventEmitter();
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on('pipeline:start', h1);
    emitter.on('pipeline:start', h2);
    emitter.emit('pipeline:start', { pipelineId: 'p', runId: 'r', input: null });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('off() removes a handler', () => {
    const emitter = new PipelineEventEmitter();
    const handler = vi.fn();
    emitter.on('pipeline:start', handler);
    emitter.off('pipeline:start', handler);
    emitter.emit('pipeline:start', { pipelineId: 'p', runId: 'r', input: null });
    expect(handler).not.toHaveBeenCalled();
  });

  it('emitting an unregistered event is a no-op', () => {
    const emitter = new PipelineEventEmitter();
    expect(() => {
      emitter.emit('pipeline:start', { pipelineId: 'p', runId: 'r', input: null });
    }).not.toThrow();
  });

  it('handles different event types independently', () => {
    const emitter = new PipelineEventEmitter();
    const startHandler = vi.fn();
    const errorHandler = vi.fn();
    emitter.on('pipeline:start', startHandler);
    emitter.on('pipeline:error', errorHandler);

    emitter.emit('pipeline:start', { pipelineId: 'p', runId: 'r', input: null });
    expect(startHandler).toHaveBeenCalledOnce();
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it('off() on non-registered handler is a no-op', () => {
    const emitter = new PipelineEventEmitter();
    const handler = vi.fn();
    expect(() => emitter.off('pipeline:start', handler)).not.toThrow();
  });

  it('handler receives correct event data for stage events', () => {
    const emitter = new PipelineEventEmitter();
    const handler = vi.fn();
    emitter.on('stage:complete', handler);

    const event = {
      pipelineId: 'p',
      runId: 'r',
      stageName: 'parse',
      timestamp: new Date(),
      output: 42,
      durationMs: 10.5,
    };
    emitter.emit('stage:complete', event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('emit calls handlers in registration order', () => {
    const emitter = new PipelineEventEmitter();
    const order: number[] = [];
    emitter.on('pipeline:start', () => order.push(1));
    emitter.on('pipeline:start', () => order.push(2));
    emitter.on('pipeline:start', () => order.push(3));
    emitter.emit('pipeline:start', { pipelineId: 'p', runId: 'r', input: null });
    expect(order).toEqual([1, 2, 3]);
  });
});

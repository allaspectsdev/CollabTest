import { describe, it, expect } from 'vitest';
import { PipelineContextImpl } from '../../src/pipeline/context.js';

describe('PipelineContext', () => {
  it('has a pipelineId matching the constructor argument', () => {
    const ctx = new PipelineContextImpl('my-pipeline');
    expect(ctx.pipelineId).toBe('my-pipeline');
  });

  it('generates a unique runId', () => {
    const ctx1 = new PipelineContextImpl('p');
    const ctx2 = new PipelineContextImpl('p');
    expect(ctx1.runId).not.toBe(ctx2.runId);
    expect(ctx1.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('has a startedAt Date', () => {
    const before = new Date();
    const ctx = new PipelineContextImpl('p');
    const after = new Date();
    expect(ctx.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(ctx.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('get/set work for arbitrary keys', () => {
    const ctx = new PipelineContextImpl('p');
    ctx.set('count', 42);
    ctx.set('name', 'test');
    expect(ctx.get<number>('count')).toBe(42);
    expect(ctx.get<string>('name')).toBe('test');
  });

  it('get returns undefined for missing keys', () => {
    const ctx = new PipelineContextImpl('p');
    expect(ctx.get('nonexistent')).toBeUndefined();
  });

  it('metadata map is accessible directly', () => {
    const ctx = new PipelineContextImpl('p');
    ctx.set('key', 'value');
    expect(ctx.metadata.get('key')).toBe('value');
  });
});

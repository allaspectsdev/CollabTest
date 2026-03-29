import { describe, it, expect } from "vitest";
import { compareTasks, matchesFilter } from "../src/task.js";
import type { Task, TaskFilter, TaskSort } from "../src/task.js";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task_1",
    title: "Default task",
    description: "A default task for testing",
    status: "todo",
    priority: "medium",
    tags: [],
    assignee: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    completedAt: null,
    ...overrides,
  };
}

describe("compareTasks", () => {
  it("sorts by title ascending", () => {
    const a = makeTask({ title: "Alpha" });
    const b = makeTask({ title: "Beta" });
    const sort: TaskSort = { field: "title", direction: "asc" };
    expect(compareTasks(a, b, sort)).toBeLessThan(0);
    expect(compareTasks(b, a, sort)).toBeGreaterThan(0);
  });

  it("sorts by title descending", () => {
    const a = makeTask({ title: "Alpha" });
    const b = makeTask({ title: "Beta" });
    const sort: TaskSort = { field: "title", direction: "desc" };
    expect(compareTasks(a, b, sort)).toBeGreaterThan(0);
  });

  it("sorts by priority ascending (low < critical)", () => {
    const low = makeTask({ priority: "low" });
    const critical = makeTask({ priority: "critical" });
    const sort: TaskSort = { field: "priority", direction: "asc" };
    expect(compareTasks(low, critical, sort)).toBeLessThan(0);
  });

  it("sorts by priority descending", () => {
    const low = makeTask({ priority: "low" });
    const high = makeTask({ priority: "high" });
    const sort: TaskSort = { field: "priority", direction: "desc" };
    expect(compareTasks(low, high, sort)).toBeGreaterThan(0);
  });

  it("returns 0 for equal priorities", () => {
    const a = makeTask({ priority: "medium" });
    const b = makeTask({ priority: "medium" });
    expect(compareTasks(a, b, { field: "priority", direction: "asc" })).toBe(0);
  });

  it("sorts by createdAt ascending", () => {
    const older = makeTask({ createdAt: new Date("2025-01-01") });
    const newer = makeTask({ createdAt: new Date("2026-06-01") });
    const sort: TaskSort = { field: "createdAt", direction: "asc" };
    expect(compareTasks(older, newer, sort)).toBeLessThan(0);
  });

  it("sorts by updatedAt descending", () => {
    const older = makeTask({ updatedAt: new Date("2025-01-01") });
    const newer = makeTask({ updatedAt: new Date("2026-06-01") });
    const sort: TaskSort = { field: "updatedAt", direction: "desc" };
    expect(compareTasks(older, newer, sort)).toBeGreaterThan(0);
  });
});

describe("matchesFilter", () => {
  it("matches when no filter criteria are set", () => {
    expect(matchesFilter(makeTask(), {})).toBe(true);
  });

  it("filters by single status", () => {
    const task = makeTask({ status: "todo" });
    expect(matchesFilter(task, { status: "todo" })).toBe(true);
    expect(matchesFilter(task, { status: "done" })).toBe(false);
  });

  it("filters by multiple statuses", () => {
    const task = makeTask({ status: "in_progress" });
    expect(matchesFilter(task, { status: ["todo", "in_progress"] })).toBe(true);
    expect(matchesFilter(task, { status: ["done", "cancelled"] })).toBe(false);
  });

  it("filters by single priority", () => {
    const task = makeTask({ priority: "high" });
    expect(matchesFilter(task, { priority: "high" })).toBe(true);
    expect(matchesFilter(task, { priority: "low" })).toBe(false);
  });

  it("filters by multiple priorities", () => {
    const task = makeTask({ priority: "critical" });
    expect(matchesFilter(task, { priority: ["high", "critical"] })).toBe(true);
    expect(matchesFilter(task, { priority: ["low", "medium"] })).toBe(false);
  });

  it("filters by assignee", () => {
    const assigned = makeTask({ assignee: "ryan" });
    const unassigned = makeTask({ assignee: null });
    expect(matchesFilter(assigned, { assignee: "ryan" })).toBe(true);
    expect(matchesFilter(assigned, { assignee: "bryan" })).toBe(false);
    expect(matchesFilter(unassigned, { assignee: null })).toBe(true);
  });

  it("filters by tags (any match)", () => {
    const task = makeTask({ tags: ["bug", "frontend"] });
    expect(matchesFilter(task, { tags: ["bug"] })).toBe(true);
    expect(matchesFilter(task, { tags: ["backend"] })).toBe(false);
    expect(matchesFilter(task, { tags: ["frontend", "backend"] })).toBe(true);
  });

  it("passes when tags filter is empty array", () => {
    const task = makeTask({ tags: ["bug"] });
    expect(matchesFilter(task, { tags: [] })).toBe(true);
  });

  it("filters by search in title", () => {
    const task = makeTask({ title: "Fix login bug", description: "" });
    expect(matchesFilter(task, { search: "login" })).toBe(true);
    expect(matchesFilter(task, { search: "LOGIN" })).toBe(true);
    expect(matchesFilter(task, { search: "signup" })).toBe(false);
  });

  it("filters by search in description", () => {
    const task = makeTask({ title: "Bug", description: "Users cannot authenticate" });
    expect(matchesFilter(task, { search: "authenticate" })).toBe(true);
  });

  it("passes when search is empty string", () => {
    expect(matchesFilter(makeTask(), { search: "" })).toBe(true);
  });

  it("combines multiple filter criteria (AND logic)", () => {
    const task = makeTask({
      status: "in_progress",
      priority: "high",
      assignee: "ryan",
      tags: ["bug"],
      title: "Fix crash",
    });
    const filter: TaskFilter = {
      status: "in_progress",
      priority: "high",
      assignee: "ryan",
      tags: ["bug"],
      search: "crash",
    };
    expect(matchesFilter(task, filter)).toBe(true);
  });

  it("rejects when any combined filter criterion fails", () => {
    const task = makeTask({ status: "todo", priority: "high" });
    expect(matchesFilter(task, { status: "todo", priority: "low" })).toBe(false);
  });
});

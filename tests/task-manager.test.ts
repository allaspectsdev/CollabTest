import { describe, it, expect, beforeEach } from "vitest";
import { TaskManager } from "../src/task-manager.js";
import { ValidationError } from "../src/validators.js";

let manager: TaskManager;

beforeEach(() => {
  manager = new TaskManager();
});

describe("TaskManager.create", () => {
  it("creates a task with defaults", () => {
    const task = manager.create({ title: "First task" });
    expect(task.id).toMatch(/^task_/);
    expect(task.title).toBe("First task");
    expect(task.description).toBe("");
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");
    expect(task.tags).toEqual([]);
    expect(task.assignee).toBeNull();
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
    expect(task.completedAt).toBeNull();
  });

  it("creates a task with all fields", () => {
    const task = manager.create({
      title: "Detailed task",
      description: "Full details",
      priority: "critical",
      tags: ["urgent", "api"],
      assignee: "bryan",
    });
    expect(task.priority).toBe("critical");
    expect(task.tags).toEqual(["urgent", "api"]);
    expect(task.assignee).toBe("bryan");
  });

  it("generates unique IDs", () => {
    const a = manager.create({ title: "A" });
    const b = manager.create({ title: "B" });
    expect(a.id).not.toBe(b.id);
  });

  it("rejects invalid input", () => {
    expect(() => manager.create({ title: "" })).toThrow(ValidationError);
  });

  it("returns a copy (mutations don't affect internal state)", () => {
    const task = manager.create({ title: "Original" });
    task.title = "Mutated";
    expect(manager.get(task.id).title).toBe("Original");
  });
});

describe("TaskManager.get", () => {
  it("retrieves a created task", () => {
    const created = manager.create({ title: "Lookup test" });
    const fetched = manager.get(created.id);
    expect(fetched.title).toBe("Lookup test");
    expect(fetched.id).toBe(created.id);
  });

  it("throws for non-existent ID", () => {
    expect(() => manager.get("nope")).toThrow("Task not found: nope");
  });

  it("returns a copy", () => {
    const task = manager.create({ title: "Copy" });
    const a = manager.get(task.id);
    const b = manager.get(task.id);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe("TaskManager.update", () => {
  it("updates title", () => {
    const task = manager.create({ title: "Old" });
    const updated = manager.update(task.id, { title: "New" });
    expect(updated.title).toBe("New");
  });

  it("updates multiple fields", () => {
    const task = manager.create({ title: "Task", priority: "low" });
    const updated = manager.update(task.id, {
      title: "Updated",
      priority: "high",
      tags: ["refactor"],
      assignee: "ryan",
    });
    expect(updated.title).toBe("Updated");
    expect(updated.priority).toBe("high");
    expect(updated.tags).toEqual(["refactor"]);
    expect(updated.assignee).toBe("ryan");
  });

  it("advances updatedAt", () => {
    const task = manager.create({ title: "Timestamps" });
    const original = task.updatedAt;
    const updated = manager.update(task.id, { title: "Changed" });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.getTime());
  });

  it("throws for non-existent task", () => {
    expect(() => manager.update("nope", { title: "X" })).toThrow("Task not found");
  });

  it("rejects invalid fields", () => {
    const task = manager.create({ title: "Valid" });
    expect(() => manager.update(task.id, { title: "" })).toThrow(ValidationError);
  });

  it("no-op update when empty input", () => {
    const task = manager.create({ title: "Same" });
    const updated = manager.update(task.id, {});
    expect(updated.title).toBe("Same");
  });
});

describe("TaskManager.transition", () => {
  it("transitions todo -> in_progress", () => {
    const task = manager.create({ title: "Work" });
    const updated = manager.transition(task.id, "in_progress");
    expect(updated.status).toBe("in_progress");
    expect(updated.completedAt).toBeNull();
  });

  it("transitions in_progress -> done (sets completedAt)", () => {
    const task = manager.create({ title: "Finish" });
    manager.transition(task.id, "in_progress");
    const done = manager.transition(task.id, "done");
    expect(done.status).toBe("done");
    expect(done.completedAt).toBeInstanceOf(Date);
  });

  it("transitions todo -> cancelled (sets completedAt)", () => {
    const task = manager.create({ title: "Cancel me" });
    const cancelled = manager.transition(task.id, "cancelled");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.completedAt).toBeInstanceOf(Date);
  });

  it("transitions done -> todo (clears completedAt)", () => {
    const task = manager.create({ title: "Reopen" });
    manager.transition(task.id, "in_progress");
    manager.transition(task.id, "done");
    const reopened = manager.transition(task.id, "todo");
    expect(reopened.status).toBe("todo");
    expect(reopened.completedAt).toBeNull();
  });

  it("transitions cancelled -> todo", () => {
    const task = manager.create({ title: "Revive" });
    manager.transition(task.id, "cancelled");
    const revived = manager.transition(task.id, "todo");
    expect(revived.status).toBe("todo");
  });

  it("rejects invalid transitions", () => {
    const task = manager.create({ title: "No skip" });
    expect(() => manager.transition(task.id, "done")).toThrow("Invalid transition");
  });

  it("rejects todo -> todo", () => {
    const task = manager.create({ title: "Same" });
    expect(() => manager.transition(task.id, "todo")).toThrow("Invalid transition");
  });

  it("rejects in_progress -> in_progress", () => {
    const task = manager.create({ title: "Same" });
    manager.transition(task.id, "in_progress");
    expect(() => manager.transition(task.id, "in_progress")).toThrow("Invalid transition");
  });

  it("throws for non-existent task", () => {
    expect(() => manager.transition("nope", "done")).toThrow("Task not found");
  });
});

describe("TaskManager.delete", () => {
  it("removes a task", () => {
    const task = manager.create({ title: "Delete me" });
    manager.delete(task.id);
    expect(() => manager.get(task.id)).toThrow("Task not found");
  });

  it("throws for non-existent task", () => {
    expect(() => manager.delete("nope")).toThrow("Task not found");
  });
});

describe("TaskManager.list", () => {
  it("returns all tasks when no filter", () => {
    manager.create({ title: "A" });
    manager.create({ title: "B" });
    expect(manager.list()).toHaveLength(2);
  });

  it("returns empty array when no tasks", () => {
    expect(manager.list()).toEqual([]);
  });

  it("filters by status", () => {
    const a = manager.create({ title: "A" });
    manager.create({ title: "B" });
    manager.transition(a.id, "in_progress");
    const inProgress = manager.list({ status: "in_progress" });
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].title).toBe("A");
  });

  it("filters by priority", () => {
    manager.create({ title: "Low", priority: "low" });
    manager.create({ title: "High", priority: "high" });
    const high = manager.list({ priority: "high" });
    expect(high).toHaveLength(1);
    expect(high[0].title).toBe("High");
  });

  it("filters by assignee", () => {
    manager.create({ title: "Ryan's", assignee: "ryan" });
    manager.create({ title: "Bryan's", assignee: "bryan" });
    manager.create({ title: "Nobody's" });
    expect(manager.list({ assignee: "ryan" })).toHaveLength(1);
    expect(manager.list({ assignee: null })).toHaveLength(1);
  });

  it("filters by tags", () => {
    manager.create({ title: "Bug", tags: ["bug", "frontend"] });
    manager.create({ title: "Feature", tags: ["feature"] });
    const bugs = manager.list({ tags: ["bug"] });
    expect(bugs).toHaveLength(1);
    expect(bugs[0].title).toBe("Bug");
  });

  it("filters by search", () => {
    manager.create({ title: "Fix login", description: "" });
    manager.create({ title: "Add signup", description: "" });
    const results = manager.list({ search: "login" });
    expect(results).toHaveLength(1);
  });

  it("sorts by title ascending", () => {
    manager.create({ title: "Charlie" });
    manager.create({ title: "Alpha" });
    manager.create({ title: "Bravo" });
    const sorted = manager.list(undefined, { field: "title", direction: "asc" });
    expect(sorted.map((t) => t.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorts by priority descending", () => {
    manager.create({ title: "Low", priority: "low" });
    manager.create({ title: "Critical", priority: "critical" });
    manager.create({ title: "Medium", priority: "medium" });
    const sorted = manager.list(undefined, { field: "priority", direction: "desc" });
    expect(sorted.map((t) => t.title)).toEqual(["Critical", "Medium", "Low"]);
  });

  it("combines filter and sort", () => {
    manager.create({ title: "B bug", priority: "high", tags: ["bug"] });
    manager.create({ title: "A bug", priority: "critical", tags: ["bug"] });
    manager.create({ title: "Feature", priority: "low", tags: ["feature"] });
    const result = manager.list({ tags: ["bug"] }, { field: "title", direction: "asc" });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.title)).toEqual(["A bug", "B bug"]);
  });

  it("returns copies of tasks", () => {
    manager.create({ title: "Original" });
    const list = manager.list();
    list[0].title = "Mutated";
    expect(manager.list()[0].title).toBe("Original");
  });
});

describe("TaskManager.count", () => {
  it("returns total count without filter", () => {
    manager.create({ title: "A" });
    manager.create({ title: "B" });
    expect(manager.count()).toBe(2);
  });

  it("returns 0 for empty manager", () => {
    expect(manager.count()).toBe(0);
  });

  it("counts with filter", () => {
    manager.create({ title: "A", priority: "high" });
    manager.create({ title: "B", priority: "low" });
    manager.create({ title: "C", priority: "high" });
    expect(manager.count({ priority: "high" })).toBe(2);
  });
});

describe("TaskManager.clear", () => {
  it("removes all tasks", () => {
    manager.create({ title: "A" });
    manager.create({ title: "B" });
    manager.clear();
    expect(manager.count()).toBe(0);
    expect(manager.list()).toEqual([]);
  });
});

describe("TaskManager.stats", () => {
  it("returns zeros for empty manager", () => {
    const stats = manager.stats();
    expect(stats.total).toBe(0);
    expect(stats.byStatus).toEqual({ todo: 0, in_progress: 0, done: 0, cancelled: 0 });
    expect(stats.byPriority).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
  });

  it("accurately counts tasks by status and priority", () => {
    const a = manager.create({ title: "A", priority: "high" });
    manager.create({ title: "B", priority: "low" });
    manager.create({ title: "C", priority: "high" });
    manager.transition(a.id, "in_progress");

    const stats = manager.stats();
    expect(stats.total).toBe(3);
    expect(stats.byStatus.todo).toBe(2);
    expect(stats.byStatus.in_progress).toBe(1);
    expect(stats.byPriority.high).toBe(2);
    expect(stats.byPriority.low).toBe(1);
  });
});

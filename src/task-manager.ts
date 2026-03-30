import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskFilter,
  TaskSort,
} from "./task.js";
import { compareTasks, matchesFilter } from "./task.js";
import { validateCreateInput, validateUpdateInput, validateStatus } from "./validators.js";

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `task_${Date.now()}_${idCounter}`;
}

export class TaskManager {
  private tasks: Map<string, Task> = new Map();

  create(input: CreateTaskInput): Task {
    const validated = validateCreateInput(input);
    const now = new Date();
    const task: Task = {
      id: generateId(),
      title: validated.title,
      description: validated.description,
      status: "todo",
      priority: validated.priority,
      tags: validated.tags,
      assignee: validated.assignee,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    this.tasks.set(task.id, task);
    return { ...task };
  }

  get(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return { ...task };
  }

  update(id: string, input: UpdateTaskInput): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    const validated = validateUpdateInput(input);
    if (validated.title !== undefined) task.title = validated.title;
    if (validated.description !== undefined) task.description = validated.description;
    if (validated.priority !== undefined) task.priority = validated.priority;
    if (validated.tags !== undefined) task.tags = validated.tags;
    if (validated.assignee !== undefined) task.assignee = validated.assignee;
    task.updatedAt = new Date();
    return { ...task };
  }

  transition(id: string, newStatus: TaskStatus): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    validateStatus(newStatus);
    assertValidTransition(task.status, newStatus);
    task.status = newStatus;
    task.updatedAt = new Date();
    if (newStatus === "done" || newStatus === "cancelled") {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }
    return { ...task };
  }

  delete(id: string): void {
    if (!this.tasks.has(id)) {
      throw new Error(`Task not found: ${id}`);
    }
    this.tasks.delete(id);
  }

  list(filter?: TaskFilter, sort?: TaskSort): Task[] {
    let result = Array.from(this.tasks.values());
    if (filter) {
      result = result.filter((task) => matchesFilter(task, filter));
    }
    if (sort) {
      result.sort((a, b) => compareTasks(a, b, sort));
    }
    return result.map((task) => ({ ...task }));
  }

  count(filter?: TaskFilter): number {
    if (!filter) return this.tasks.size;
    return Array.from(this.tasks.values()).filter((task) => matchesFilter(task, filter)).length;
  }

  clear(): void {
    this.tasks.clear();
  }

  stats(): {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<string, number>;
  } {
    const byStatus: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    };
    const byPriority: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    for (const task of this.tasks.values()) {
      byStatus[task.status]++;
      byPriority[task.priority]++;
    }
    return { total: this.tasks.size, byStatus, byPriority };
  }
}

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress", "cancelled"],
  in_progress: ["done", "todo", "cancelled"],
  done: ["todo"],
  cancelled: ["todo"],
};

function assertValidTransition(from: TaskStatus, to: TaskStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid transition from "${from}" to "${to}"`);
  }
}

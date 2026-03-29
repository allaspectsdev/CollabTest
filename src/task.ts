export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  assignee: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  assignee?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  assignee?: string | null;
}

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assignee?: string | null;
  tags?: string[];
  search?: string;
}

export type TaskSortField = "title" | "priority" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export interface TaskSort {
  field: TaskSortField;
  direction: SortDirection;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export function compareTasks(a: Task, b: Task, sort: TaskSort): number {
  const dir = sort.direction === "asc" ? 1 : -1;

  switch (sort.field) {
    case "title":
      return dir * a.title.localeCompare(b.title);
    case "priority":
      return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    case "createdAt":
      return dir * (a.createdAt.getTime() - b.createdAt.getTime());
    case "updatedAt":
      return dir * (a.updatedAt.getTime() - b.updatedAt.getTime());
  }
}

export function matchesFilter(task: Task, filter: TaskFilter): boolean {
  if (filter.status !== undefined) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    if (!statuses.includes(task.status)) return false;
  }

  if (filter.priority !== undefined) {
    const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
    if (!priorities.includes(task.priority)) return false;
  }

  if (filter.assignee !== undefined) {
    if (task.assignee !== filter.assignee) return false;
  }

  if (filter.tags !== undefined && filter.tags.length > 0) {
    if (!filter.tags.some((tag) => task.tags.includes(tag))) return false;
  }

  if (filter.search !== undefined && filter.search.length > 0) {
    const query = filter.search.toLowerCase();
    const inTitle = task.title.toLowerCase().includes(query);
    const inDesc = task.description.toLowerCase().includes(query);
    if (!inTitle && !inDesc) return false;
  }

  return true;
}

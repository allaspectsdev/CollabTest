import type { CreateTaskInput, UpdateTaskInput, TaskPriority, TaskStatus } from "./task.js";

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];
const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_COUNT = 20;

export function validateTitle(title: unknown): string {
  if (typeof title !== "string") {
    throw new ValidationError("Title must be a string", "title");
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Title must not be empty", "title");
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(
      `Title must be at most ${MAX_TITLE_LENGTH} characters`,
      "title",
    );
  }
  return trimmed;
}

export function validateDescription(description: unknown): string {
  if (typeof description !== "string") {
    throw new ValidationError("Description must be a string", "description");
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
      "description",
    );
  }
  return description;
}

export function validatePriority(priority: unknown): TaskPriority {
  if (!VALID_PRIORITIES.includes(priority as TaskPriority)) {
    throw new ValidationError(
      `Priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      "priority",
    );
  }
  return priority as TaskPriority;
}

export function validateStatus(status: unknown): TaskStatus {
  if (!VALID_STATUSES.includes(status as TaskStatus)) {
    throw new ValidationError(
      `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      "status",
    );
  }
  return status as TaskStatus;
}

export function validateTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    throw new ValidationError("Tags must be an array", "tags");
  }
  if (tags.length > MAX_TAGS_COUNT) {
    throw new ValidationError(`At most ${MAX_TAGS_COUNT} tags are allowed`, "tags");
  }
  return tags.map((tag, i) => {
    if (typeof tag !== "string") {
      throw new ValidationError(`Tag at index ${i} must be a string`, "tags");
    }
    const trimmed = tag.trim().toLowerCase();
    if (trimmed.length === 0) {
      throw new ValidationError(`Tag at index ${i} must not be empty`, "tags");
    }
    if (trimmed.length > MAX_TAG_LENGTH) {
      throw new ValidationError(
        `Tag at index ${i} must be at most ${MAX_TAG_LENGTH} characters`,
        "tags",
      );
    }
    return trimmed;
  });
}

export function validateCreateInput(input: CreateTaskInput): {
  title: string;
  description: string;
  priority: TaskPriority;
  tags: string[];
  assignee: string | null;
} {
  const title = validateTitle(input.title);
  const description = input.description !== undefined
    ? validateDescription(input.description)
    : "";
  const priority = input.priority !== undefined
    ? validatePriority(input.priority)
    : "medium";
  const tags = input.tags !== undefined
    ? validateTags(input.tags)
    : [];
  const assignee = input.assignee ?? null;

  return { title, description, priority, tags, assignee };
}

export function validateUpdateInput(input: UpdateTaskInput): UpdateTaskInput {
  const result: UpdateTaskInput = {};
  if (input.title !== undefined) result.title = validateTitle(input.title);
  if (input.description !== undefined) result.description = validateDescription(input.description);
  if (input.priority !== undefined) result.priority = validatePriority(input.priority);
  if (input.tags !== undefined) result.tags = validateTags(input.tags);
  if (input.assignee !== undefined) result.assignee = input.assignee;
  return result;
}

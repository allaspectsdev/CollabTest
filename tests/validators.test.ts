import { describe, it, expect } from "vitest";
import {
  ValidationError,
  validateTitle,
  validateDescription,
  validatePriority,
  validateStatus,
  validateTags,
  validateCreateInput,
  validateUpdateInput,
} from "../src/validators.js";

describe("validateTitle", () => {
  it("accepts a valid title", () => {
    expect(validateTitle("Fix login bug")).toBe("Fix login bug");
  });

  it("trims whitespace", () => {
    expect(validateTitle("  spaced  ")).toBe("spaced");
  });

  it("rejects non-string", () => {
    expect(() => validateTitle(123)).toThrow(ValidationError);
    expect(() => validateTitle(null)).toThrow(ValidationError);
  });

  it("rejects empty string", () => {
    expect(() => validateTitle("")).toThrow(ValidationError);
    expect(() => validateTitle("   ")).toThrow(ValidationError);
  });

  it("rejects title exceeding 200 characters", () => {
    expect(() => validateTitle("a".repeat(201))).toThrow(ValidationError);
  });

  it("accepts title at exactly 200 characters", () => {
    expect(validateTitle("a".repeat(200))).toBe("a".repeat(200));
  });

  it("includes field name in error", () => {
    try {
      validateTitle("");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("title");
    }
  });
});

describe("validateDescription", () => {
  it("accepts a valid description", () => {
    expect(validateDescription("Some details")).toBe("Some details");
  });

  it("accepts empty description", () => {
    expect(validateDescription("")).toBe("");
  });

  it("rejects non-string", () => {
    expect(() => validateDescription(42)).toThrow(ValidationError);
  });

  it("rejects description exceeding 5000 characters", () => {
    expect(() => validateDescription("a".repeat(5001))).toThrow(ValidationError);
  });
});

describe("validatePriority", () => {
  it.each(["low", "medium", "high", "critical"] as const)("accepts '%s'", (p) => {
    expect(validatePriority(p)).toBe(p);
  });

  it("rejects invalid priority", () => {
    expect(() => validatePriority("urgent")).toThrow(ValidationError);
    expect(() => validatePriority(1)).toThrow(ValidationError);
  });
});

describe("validateStatus", () => {
  it.each(["todo", "in_progress", "done", "cancelled"] as const)("accepts '%s'", (s) => {
    expect(validateStatus(s)).toBe(s);
  });

  it("rejects invalid status", () => {
    expect(() => validateStatus("pending")).toThrow(ValidationError);
  });
});

describe("validateTags", () => {
  it("accepts valid tags and normalizes them", () => {
    expect(validateTags(["Bug", " Frontend "])).toEqual(["bug", "frontend"]);
  });

  it("accepts an empty array", () => {
    expect(validateTags([])).toEqual([]);
  });

  it("rejects non-array", () => {
    expect(() => validateTags("bug")).toThrow(ValidationError);
  });

  it("rejects non-string tag entries", () => {
    expect(() => validateTags([123])).toThrow(ValidationError);
  });

  it("rejects empty tag after trimming", () => {
    expect(() => validateTags(["  "])).toThrow(ValidationError);
  });

  it("rejects tag exceeding 50 characters", () => {
    expect(() => validateTags(["a".repeat(51)])).toThrow(ValidationError);
  });

  it("rejects more than 20 tags", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(() => validateTags(tags)).toThrow(ValidationError);
  });
});

describe("validateCreateInput", () => {
  it("returns defaults for optional fields", () => {
    const result = validateCreateInput({ title: "Test" });
    expect(result).toEqual({
      title: "Test",
      description: "",
      priority: "medium",
      tags: [],
      assignee: null,
    });
  });

  it("passes through all provided fields", () => {
    const result = validateCreateInput({
      title: "Task",
      description: "Details",
      priority: "high",
      tags: ["api"],
      assignee: "ryan",
    });
    expect(result.title).toBe("Task");
    expect(result.description).toBe("Details");
    expect(result.priority).toBe("high");
    expect(result.tags).toEqual(["api"]);
    expect(result.assignee).toBe("ryan");
  });

  it("rejects invalid title in create input", () => {
    expect(() => validateCreateInput({ title: "" })).toThrow(ValidationError);
  });
});

describe("validateUpdateInput", () => {
  it("returns empty object when no fields provided", () => {
    expect(validateUpdateInput({})).toEqual({});
  });

  it("validates only provided fields", () => {
    const result = validateUpdateInput({ title: "Updated" });
    expect(result).toEqual({ title: "Updated" });
  });

  it("rejects invalid fields in update input", () => {
    expect(() => validateUpdateInput({ priority: "invalid" as never })).toThrow(ValidationError);
  });
});

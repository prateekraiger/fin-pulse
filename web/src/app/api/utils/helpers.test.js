import { describe, it, expect } from "vitest";
import {
  getUserId,
  requireString,
  requirePositiveNumber,
  requireFY,
  requireDate,
  requireId,
  isSafeColumnName,
  filterToAllowedFields,
  jsonResponse,
  errorResponse,
  serverError,
  parseJsonBody,
  buildUpdateQuery,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// getUserId
// ---------------------------------------------------------------------------
describe("getUserId", () => {
  it("returns header value when present", () => {
    const req = { headers: new Headers({ "x-user-id": "user-123" }) };
    expect(getUserId(req)).toBe("user-123");
  });

  it("returns 'demo-user' when header is missing", () => {
    const req = { headers: new Headers() };
    expect(getUserId(req)).toBe("demo-user");
  });

  it("sanitises special characters", () => {
    const req = { headers: new Headers({ "x-user-id": 'user<script>"xss' }) };
    expect(getUserId(req)).toBe("userscriptxss");
  });

  it("trims whitespace", () => {
    const req = { headers: new Headers({ "x-user-id": "  user-456  " }) };
    expect(getUserId(req)).toBe("user-456");
  });

  it("returns 'demo-user' for empty string", () => {
    const req = { headers: new Headers({ "x-user-id": "" }) };
    expect(getUserId(req)).toBe("demo-user");
  });
});

// ---------------------------------------------------------------------------
// requireString
// ---------------------------------------------------------------------------
describe("requireString", () => {
  it("passes for non-empty string", () => {
    expect(requireString("hello", "name")).toEqual({ valid: true });
  });

  it("fails for empty string", () => {
    const result = requireString("", "name");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("name");
  });

  it("fails for null/undefined", () => {
    expect(requireString(null, "name").valid).toBe(false);
    expect(requireString(undefined, "name").valid).toBe(false);
  });

  it("fails for non-string types", () => {
    expect(requireString(123, "name").valid).toBe(false);
    expect(requireString(true, "name").valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requirePositiveNumber
// ---------------------------------------------------------------------------
describe("requirePositiveNumber", () => {
  it("passes for positive number", () => {
    const result = requirePositiveNumber(42, "amount");
    expect(result.valid).toBe(true);
    expect(result.parsed).toBe(42);
  });

  it("parses string numbers", () => {
    const result = requirePositiveNumber("99.5", "amount");
    expect(result.valid).toBe(true);
    expect(result.parsed).toBe(99.5);
  });

  it("rejects negative numbers", () => {
    expect(requirePositiveNumber(-1, "amount").valid).toBe(false);
  });

  it("allows zero by default", () => {
    expect(requirePositiveNumber(0, "amount").valid).toBe(true);
  });

  it("rejects zero when allowZero=false", () => {
    expect(
      requirePositiveNumber(0, "rate", { allowZero: false }).valid
    ).toBe(false);
  });

  it("enforces max when set", () => {
    expect(
      requirePositiveNumber(150, "pct", { max: 100 }).valid
    ).toBe(false);
    expect(
      requirePositiveNumber(100, "pct", { max: 100 }).valid
    ).toBe(true);
  });

  it("rejects NaN", () => {
    expect(requirePositiveNumber("abc", "amount").valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requireFY
// ---------------------------------------------------------------------------
describe("requireFY", () => {
  it("passes for valid FY", () => {
    expect(requireFY("2024-25")).toEqual({ valid: true });
  });

  it("fails for null", () => {
    expect(requireFY(null).valid).toBe(false);
  });

  it("fails for bad format", () => {
    expect(requireFY("2024").valid).toBe(false);
    expect(requireFY("2024-2025").valid).toBe(false);
    expect(requireFY("abcd-ef").valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requireDate
// ---------------------------------------------------------------------------
describe("requireDate", () => {
  it("passes for valid ISO date", () => {
    expect(requireDate("2024-06-15", "date").valid).toBe(true);
  });

  it("fails for invalid date string", () => {
    expect(requireDate("not-a-date", "date").valid).toBe(false);
  });

  it("fails for null", () => {
    expect(requireDate(null, "date").valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requireId
// ---------------------------------------------------------------------------
describe("requireId", () => {
  it("passes for valid id", () => {
    expect(requireId("abc-123", "id").valid).toBe(true);
  });

  it("fails for empty string", () => {
    expect(requireId("", "id").valid).toBe(false);
  });

  it("fails for null", () => {
    expect(requireId(null, "id").valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSafeColumnName
// ---------------------------------------------------------------------------
describe("isSafeColumnName", () => {
  it("allows normal columns", () => {
    expect(isSafeColumnName("amount")).toBe(true);
    expect(isSafeColumnName("business_percentage")).toBe(true);
    expect(isSafeColumnName("_private")).toBe(true);
  });

  it("rejects SQL injection attempts", () => {
    expect(isSafeColumnName("amount; DROP TABLE")).toBe(false);
    expect(isSafeColumnName("1bad")).toBe(false);
    expect(isSafeColumnName("col-name")).toBe(false);
    expect(isSafeColumnName("COL")).toBe(false); // uppercase
  });
});

// ---------------------------------------------------------------------------
// filterToAllowedFields
// ---------------------------------------------------------------------------
describe("filterToAllowedFields", () => {
  it("keeps only allowed fields", () => {
    const allowed = new Set(["name", "age"]);
    const result = filterToAllowedFields(
      { name: "Alice", age: 30, password: "secret" },
      allowed
    );
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("rejects unsafe column names even if in set", () => {
    const allowed = new Set(["DROP TABLE"]);
    const result = filterToAllowedFields({ "DROP TABLE": "x" }, allowed);
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Response builders
// ---------------------------------------------------------------------------
describe("jsonResponse", () => {
  it("creates 200 JSON response", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("supports custom status", async () => {
    const res = jsonResponse({ created: true }, 201);
    expect(res.status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("creates error JSON response", async () => {
    const res = errorResponse("Bad input", 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Bad input");
  });
});

describe("serverError", () => {
  it("creates 500 response", async () => {
    const res = serverError("GET /api/test", new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("internal server error");
  });
});

// ---------------------------------------------------------------------------
// parseJsonBody
// ---------------------------------------------------------------------------
describe("parseJsonBody", () => {
  it("parses valid JSON body", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });
    const { data, error } = await parseJsonBody(req);
    expect(error).toBeUndefined();
    expect(data).toEqual({ foo: "bar" });
  });

  it("returns error for invalid JSON", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const { data, error } = await parseJsonBody(req);
    expect(data).toBeUndefined();
    expect(error).toBeDefined();
    expect(error.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// buildUpdateQuery
// ---------------------------------------------------------------------------
describe("buildUpdateQuery", () => {
  it("builds a parameterised UPDATE query", () => {
    const { query, params } = buildUpdateQuery(
      "expenses",
      { amount: 100, notes: "test" },
      "user-1",
      "id-1"
    );
    expect(query).toContain("UPDATE expenses SET");
    expect(query).toContain('"amount" = $3');
    expect(query).toContain('"notes" = $4');
    expect(query).toContain("updated_at = NOW()");
    expect(query).toContain("WHERE id = $1 AND user_id = $2");
    expect(query).toContain("RETURNING *");
    expect(params).toEqual(["id-1", "user-1", 100, "test"]);
  });

  it("omits updated_at when option is false", () => {
    const { query } = buildUpdateQuery(
      "expenses",
      { amount: 50 },
      "u",
      "i",
      { addUpdatedAt: false }
    );
    expect(query).not.toContain("updated_at");
  });
});

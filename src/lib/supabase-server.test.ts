import { describe, expect, it } from "vitest";
import { isIdempotencyKey, isUuid } from "./supabase-server";

describe("server request validation", () => {
  it("accepts canonical UUIDs and rejects malformed identifiers", () => {
    expect(isUuid("b3f2f6b0-8c85-4e2a-9b65-8c1f0e4a3d11")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("accepts bounded idempotency keys", () => {
    expect(isIdempotencyKey("redeem:order_123")).toBe(true);
    expect(isIdempotencyKey("short")).toBe(false);
    expect(isIdempotencyKey("bad key value")).toBe(false);
    expect(isIdempotencyKey("x".repeat(129))).toBe(false);
  });
});

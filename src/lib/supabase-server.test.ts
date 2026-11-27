import { afterEach, describe, expect, it, vi } from "vitest";
import {
  callRedemptionRpc,
  isIdempotencyKey,
  isUuid,
  verifySupabaseAccessToken,
} from "./supabase-server";

const userId = "b3f2f6b0-8c85-4e2a-9b65-8c1f0e4a3d11";

describe("server request validation", () => {
  it("accepts canonical UUIDs and rejects malformed identifiers", () => {
    expect(isUuid(userId)).toBe(true);
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

describe("Supabase server adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubValidConfig() {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
  }

  it("derives identity only from Supabase Auth's verified user response", async () => {
    stubValidConfig();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: userId }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifySupabaseAccessToken("valid-access-token")).resolves.toEqual({ id: userId });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "anon-test-key",
          Authorization: "Bearer valid-access-token",
        }),
        cache: "no-store",
      }),
    );
  });

  it("rejects an access token when Supabase Auth returns an unauthorized response", async () => {
    stubValidConfig();
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifySupabaseAccessToken("expired-or-forged-token")).resolves.toBeNull();
  });

  it("rejects a successful Auth response that does not contain a valid UUID identity", async () => {
    stubValidConfig();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "not-a-user-id" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifySupabaseAccessToken("token-with-invalid-response")).resolves.toBeNull();
  });

  it("rejects non-HTTPS Supabase endpoints outside local development", async () => {
    vi.stubEnv("SUPABASE_URL", "http://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-test-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");

    await expect(verifySupabaseAccessToken("any-token")).rejects.toThrow("SUPABASE_URL_INVALID");
  });

  it("passes only the server-verified identity to the restricted redemption RPC", async () => {
    stubValidConfig();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "reserved", redemption_id: userId }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callRedemptionRpc({
      userId,
      rewardId: "a2f2f6b0-8c85-4e2a-9b65-8c1f0e4a3d12",
      idempotencyKey: "redeem:order_123",
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/redeem_reward",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "server-only-test-key",
          Authorization: "Bearer server-only-test-key",
        }),
        body: JSON.stringify({
          p_user_id: userId,
          p_reward_id: "a2f2f6b0-8c85-4e2a-9b65-8c1f0e4a3d12",
          p_idempotency_key: "redeem:order_123",
        }),
      }),
    );
  });
});

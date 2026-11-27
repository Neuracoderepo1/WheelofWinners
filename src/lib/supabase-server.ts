// Server-only Supabase REST adapter. Never import this module into client components.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuthenticatedUser = { id: string };

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("SUPABASE_URL_INVALID");
  }
  return { url, anonKey, serviceRoleKey };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(value);
}

export async function verifySupabaseAccessToken(accessToken: string): Promise<AuthenticatedUser | null> {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const user: unknown = await response.json();
  if (typeof user !== "object" || user === null || !("id" in user) || !isUuid(user.id)) {
    return null;
  }
  return { id: user.id };
}

export async function callRedemptionRpc(input: {
  userId: string;
  rewardId: string;
  idempotencyKey: string;
}): Promise<{ ok: true; result: unknown } | { ok: false; code: string }> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/redeem_reward`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_user_id: input.userId,
      p_reward_id: input.rewardId,
      p_idempotency_key: input.idempotencyKey,
    }),
    cache: "no-store",
  });

  if (response.ok) {
    return { ok: true, result: await response.json() as unknown };
  }

  const error: unknown = await response.json().catch(() => null);
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return { ok: false, code: error.code };
  }
  return { ok: false, code: "REDEMPTION_FAILED" };
}

export async function callPublicRewardsRpc(): Promise<{ ok: true; result: unknown } | { ok: false }> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/list_published_rewards`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) return { ok: false };
  return { ok: true, result: await response.json() as unknown };
}

export async function callPointsBalanceRpc(userId: string): Promise<{ ok: true; result: unknown } | { ok: false; code: string }> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/get_points_balance`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_user_id: userId }),
    cache: "no-store",
  });
  if (response.ok) return { ok: true, result: await response.json() as unknown };

  const error: unknown = await response.json().catch(() => null);
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return { ok: false, code: error.code };
  }
  return { ok: false, code: "BALANCE_LOOKUP_FAILED" };
}

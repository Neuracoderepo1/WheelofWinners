import { NextRequest, NextResponse } from "next/server";
import {
  callRedemptionRpc,
  isIdempotencyKey,
  isUuid,
  verifySupabaseAccessToken,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ rewardId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match || match[1].length > 4096) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { rewardId } = await context.params;
  if (!isUuid(rewardId)) {
    return NextResponse.json({ error: "Invalid reward identifier." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON request body required." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const idempotencyKey =
    typeof body === "object" && body !== null && "idempotencyKey" in body
      ? body.idempotencyKey
      : undefined;
  if (!isIdempotencyKey(idempotencyKey)) {
    return NextResponse.json({ error: "A valid idempotencyKey is required." }, { status: 400 });
  }

  try {
    const user = await verifySupabaseAccessToken(match[1]);
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    // Identity comes only from Supabase Auth's verified response.
    // Any userId included in the request body is deliberately ignored.
    const result = await callRedemptionRpc({
      userId: user.id,
      rewardId,
      idempotencyKey,
    });

    if (result.ok) {
      return NextResponse.json(result.result, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (result.code === "P0002") {
      return NextResponse.json({ error: "Reward is unavailable." }, { status: 404 });
    }
    if (result.code === "42501") {
      return NextResponse.json({ error: "This account or reward is not eligible." }, { status: 403 });
    }
    if (result.code === "22023") {
      return NextResponse.json({ error: "Redemption cannot be completed with the current points or stock." }, { status: 409 });
    }
    if (result.code === "23505") {
      return NextResponse.json({ error: "This redemption request was already processed." }, { status: 409 });
    }
    return NextResponse.json({ error: "Redemption could not be completed." }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("SUPABASE_")) {
      return NextResponse.json({ error: "Rewards service is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Rewards service is temporarily unavailable." }, { status: 503 });
  }
}

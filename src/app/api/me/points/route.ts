import { NextRequest, NextResponse } from "next/server";
import {
  callPointsBalanceRpc,
  verifySupabaseAccessToken,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match || match[1].length > 4096) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const user = await verifySupabaseAccessToken(match[1]);
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const result = await callPointsBalanceRpc(user.id);
    if (!result.ok) {
      if (result.code === "42501") {
        return NextResponse.json({ error: "This account is not eligible." }, { status: 403 });
      }
      return NextResponse.json({ error: "Points balance is temporarily unavailable." }, { status: 503 });
    }

    if (typeof result.result !== "string" || !/^-?\d+$/.test(result.result)) {
      return NextResponse.json({ error: "Invalid balance response." }, { status: 502 });
    }

    return NextResponse.json({ pointsBalance: result.result }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Points balance is temporarily unavailable." }, { status: 503 });
  }
}

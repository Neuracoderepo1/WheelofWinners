import { NextResponse } from "next/server";
import { callPublicRewardsRpc } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await callPublicRewardsRpc();
    if (!result.ok || !Array.isArray(result.result)) {
      return NextResponse.json({ error: "Rewards catalogue is temporarily unavailable." }, { status: 503 });
    }
    return NextResponse.json({ rewards: result.result }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Rewards catalogue is temporarily unavailable." }, { status: 503 });
  }
}

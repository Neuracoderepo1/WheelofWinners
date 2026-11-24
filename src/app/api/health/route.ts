import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "wheelofwinners-web",
    mode: "foundation",
    integrations: "not-configured",
  });
}

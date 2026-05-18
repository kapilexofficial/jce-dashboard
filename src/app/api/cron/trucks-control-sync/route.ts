import { NextRequest, NextResponse } from "next/server";
import { syncTrucksControl } from "@/lib/trucks-control-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorize(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET || "";
  if (!expected) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const provided =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}

async function handler(req: NextRequest) {
  const denial = authorize(req);
  if (denial) return denial;
  const result = await syncTrucksControl();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export const POST = handler;
export const GET = handler;

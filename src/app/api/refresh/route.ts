import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { syncTrucksControl } from "@/lib/trucks-control-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KNOWN_TAGS = ["freights", "margins", "occurrences", "tc_km", "tc_vehicles"];

export async function POST() {
  // Invalidação de cache imediata (rápido)
  KNOWN_TAGS.forEach((t) => revalidateTag(t, { expire: 0 }));

  // Trigger sync Trucks Control (com throttle pra evitar abuso)
  const sync = await syncTrucksControl({ respectThrottle: true });

  return NextResponse.json({
    ok: sync.ok,
    status: sync.status,
    tags: KNOWN_TAGS,
    sync: {
      messages_synced: sync.messages_synced,
      pages_fetched: sync.pages_fetched,
      status: sync.status,
      elapsed_ms: sync.elapsed_ms,
    },
  });
}

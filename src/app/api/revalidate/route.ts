import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const KNOWN_TAGS = [
  "esl", "freights", "margins", "occurrences", "service-orders",
  "elithium", "tc_km", "tc_vehicles",
];

export async function POST() {
  KNOWN_TAGS.forEach((t) => revalidateTag(t, { expire: 0 }));
  return NextResponse.json({ ok: true, tags: KNOWN_TAGS });
}

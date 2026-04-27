import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const KNOWN_TAGS = ["freights", "margins", "occurrences"];

export async function POST() {
  KNOWN_TAGS.forEach((t) => revalidateTag(t, { expire: 0 }));
  return NextResponse.json({ ok: true, tags: KNOWN_TAGS });
}

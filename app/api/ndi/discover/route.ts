import { NextResponse } from "next/server";
import { discoverNdiSources, lanIPv4 } from "@/lib/ndiDiscover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [sources, lan] = await Promise.all([discoverNdiSources(2600), Promise.resolve(lanIPv4())]);
    return NextResponse.json({ sources, lan, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NDI scan failed";
    return NextResponse.json({ sources: [], lan: lanIPv4(), ok: false, error: message }, { status: 200 });
  }
}

import { NextResponse } from "next/server";
import { getRoom, postRoom, type SignalPayload } from "@/lib/ndiSignal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json(getRoom(id));
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as SignalPayload;
  return NextResponse.json(postRoom(id, body));
}

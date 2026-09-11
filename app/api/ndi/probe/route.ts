import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateLanIp(ip: string) {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
  const p = ip.split(".").map(Number);
  if (p.some((n) => n > 255)) return false;
  if (p[0] === 10) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  if (p[0] === 127) return true;
  return false;
}

export async function GET(req: Request) {
  const ip = new URL(req.url).searchParams.get("ip") ?? "";
  if (!privateLanIp(ip)) return NextResponse.json({ ok: false, error: "Bad IP" }, { status: 400 });
  const urls = [`http://${ip}:8080/`, `http://${ip}:8888/`, `http://${ip}/stream.m3u8`];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(400) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && /video|mpegurl|mp4|ogg|webm/i.test(type)) {
        return NextResponse.json({ ok: true, url, contentType: type });
      }
    } catch {
      /* try next */
    }
  }
  return NextResponse.json({ ok: false, ip });
}

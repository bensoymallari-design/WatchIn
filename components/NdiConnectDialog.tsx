"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/store/appStore";
import { uid } from "@/lib/ids";
import { startPhoneReceiver, subscribePhone, getPhoneRoom } from "@/lib/phoneReceiver";

interface NdiAdvert {
  name: string;
  host: string;
  port: number;
  ip?: string;
}

interface DiscoverResponse {
  sources: NdiAdvert[];
  lan: { address: string; name: string }[];
  ok: boolean;
  error?: string;
}

export function NdiConnectDialog() {
  const [url, setUrl] = useState("");
  const [room] = useState(() => getPhoneRoom() ?? (uid("cam").replace(/[^a-z0-9]/gi, "").slice(0, 14) || "camroom"));
  const [scan, setScan] = useState<DiscoverResponse | null>(null);
  const [scanning, setScanning] = useState(true);
  const [status, setStatus] = useState("Waiting for a phone to join…");
  const [live, setLive] = useState(false);

  const localUrl = typeof window === "undefined" ? `/cam/${room}` : `${window.location.origin}/cam/${room}`;
  const lanUrls = lanJoinUrls(room, scan?.lan ?? []);
  const phoneUrl = lanUrls[0] || localUrl;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ndi/discover", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: DiscoverResponse) => {
        if (!cancelled) setScan(data);
      })
      .catch(() => {
        if (!cancelled) setScan({ sources: [], lan: [], ok: false, error: "Scan failed" });
      })
      .finally(() => {
        if (!cancelled) setScanning(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const assetId = useApp.getState().ensureNdiAsset();
    if (!assetId) return;
    startPhoneReceiver(room, assetId);
    return subscribePhone((message, isLive) => {
      setStatus(message);
      setLive(isLive);
    });
  }, [room]);

  return (
    <div className="p-4">
      <div className="mb-2 text-sm font-semibold text-[#f5a623]">NDI / live input</div>
      <p className="mb-3 text-[12px] leading-relaxed text-stone-400">
        Chrome and Safari cannot discover or decode native NewTek NDI — including NDI HX Camera on your phone. Same Wi‑Fi is not enough: NDI uses mDNS/Bonjour, and this browser is not WATCHOUT&apos;s NDI receiver.
      </p>

      <div className="mb-3 rounded border border-[#333] bg-[#141414] p-2 text-[12px]">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-stone-500">LAN NDI advertisements</div>
        {scanning && <div className="text-stone-500">Scanning mDNS (_ndi._tcp)…</div>}
        {!scanning && (scan?.sources.length ?? 0) === 0 && (
          <div className="text-stone-500">
            No NDI names seen from this computer. Guest Wi‑Fi often blocks multicast (AP isolation). Even if a name appears, Producer still cannot take the NDI video — use Phone camera below.
          </div>
        )}
        {scan?.sources.map((s) => (
          <div key={s.name + s.ip} className="flex justify-between gap-2 border-t border-[#2a2a2a] py-1">
            <span className="truncate text-emerald-300">{s.name}</span>
            <span className="shrink-0 text-stone-500">{s.ip || s.host || "mDNS"}</span>
          </div>
        ))}
        {scan?.sources.length ? (
          <div className="mt-1 text-[11px] text-amber-200">Found on the network, but this browser cannot ingest NDI. Open the phone link to send the camera over WebRTC instead.</div>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-[120px_1fr] gap-3 rounded border border-[#333] bg-[#141414] p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="QR to phone camera"
          className="h-[120px] w-[120px] bg-white p-1"
          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(phoneUrl)}`}
        />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Phone camera (works)</div>
          <div className={`text-[11px] ${live ? "text-emerald-400" : "text-stone-300"}`}>{status}</div>
          <div className="mt-1 break-all font-mono text-[11px] text-[#f5a623]">{phoneUrl}</div>
          {lanUrls.slice(1).map((u) => (
            <div key={u} className="break-all font-mono text-[10px] text-stone-500">
              {u}
            </div>
          ))}
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              className="rounded bg-[#14532d] px-2 py-0.5 text-emerald-100"
              onClick={() => void navigator.clipboard.writeText(phoneUrl)}
            >
              Copy phone link
            </button>
            <a className="rounded bg-[#333] px-2 py-0.5" href={localUrl} target="_blank" rel="noreferrer">
              Open here
            </a>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-stone-500">
            Open the phone link in the phone&apos;s browser — not the NDI HX Camera app. The camera is blocked on http://IP; run <span className="font-mono">npm run dev:https</span> and use the https:// address. &quot;Open here&quot; uses this PC (localhost is allowed).
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded bg-[#14532d] px-2 py-1 text-emerald-100"
          onClick={() => {
            const id = useApp.getState().ensureNdiAsset();
            if (id) void useApp.getState().connectLiveSource(id, "camera");
            useApp.getState().setDialog(null);
          }}
        >
          This PC camera
        </button>
        <button
          className="rounded bg-[#14532d] px-2 py-1 text-emerald-100"
          onClick={() => {
            const id = useApp.getState().ensureNdiAsset();
            if (id) void useApp.getState().connectLiveSource(id, "screen");
            useApp.getState().setDialog(null);
          }}
        >
          Screen
        </button>
      </div>
      <L label="HTTP stream URL">
        <input value={url} placeholder="https://…/stream.m3u8 or .mp4" onChange={(e) => setUrl(e.target.value)} />
      </L>
      <div className="mt-4 flex justify-end gap-2">
        <button className="px-3 py-1" onClick={() => useApp.getState().setDialog(null)}>
          Close
        </button>
        <button
          className="rounded bg-[#f5a623] px-3 py-1 text-black"
          onClick={() => {
            const id = useApp.getState().ensureNdiAsset();
            if (id) void useApp.getState().connectLiveSource(id, "url", url);
            useApp.getState().setDialog(null);
          }}
        >
          Connect URL
        </button>
      </div>
    </div>
  );
}

function lanJoinUrls(room: string, lan: { address: string }[]) {
  if (typeof window === "undefined") return [] as string[];
  const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
  const proto = window.location.protocol;
  const path = `/cam/${room}`;
  const urls = lan.map((n) => `${proto}//${n.address}:${port}${path}`);
  const host = window.location.hostname;
  if (host && host !== "localhost" && host !== "127.0.0.1" && !urls.some((u) => u.includes(`//${host}:`))) {
    urls.unshift(`${window.location.origin}${path}`);
  }
  return [...new Set(urls)];
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-2 block">
      <div className="mb-1 text-stone-500">{label}</div>
      {children}
    </label>
  );
}

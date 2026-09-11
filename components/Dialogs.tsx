"use client";

import { useApp } from "@/store/appStore";
import { useState } from "react";

export function Dialogs() {
  const dialog = useApp((s) => s.dialog);
  if (!dialog) return null;
  return (
    <div className="absolute inset-0 z-[80] grid place-items-center bg-black/50" onClick={() => useApp.getState().setDialog(null)}>
      <div className="w-[420px] rounded border border-[#444] bg-[#1c1c1c] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {dialog === "displayGrid" && <GridDialog />}
        {dialog === "about" && <AboutDialog />}
        {dialog === "openShow" && <OpenDialog />}
        {dialog === "ndiSource" && <NdiDialog />}
      </div>
    </div>
  );
}

function GridDialog() {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(1);
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const [gap, setGap] = useState(0);
  return (
    <div className="p-4">
      <div className="mb-3 text-sm font-semibold text-[#f5a623]">Create Display Grid</div>
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <L label="Columns"><input type="number" value={cols} onChange={(e) => setCols(+e.target.value)} /></L>
        <L label="Rows"><input type="number" value={rows} onChange={(e) => setRows(+e.target.value)} /></L>
        <L label="Tile width"><input type="number" value={w} onChange={(e) => setW(+e.target.value)} /></L>
        <L label="Tile height"><input type="number" value={h} onChange={(e) => setH(+e.target.value)} /></L>
        <L label="Gap px"><input type="number" value={gap} onChange={(e) => setGap(+e.target.value)} /></L>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="px-3 py-1" onClick={() => useApp.getState().setDialog(null)}>Cancel</button>
        <button
          className="rounded bg-[#f5a623] px-3 py-1 text-black"
          onClick={() => {
            useApp.getState().addDisplayGrid(cols, rows, w, h, gap);
            useApp.getState().setDialog(null);
            useApp.getState().frameDisplays();
          }}
        >
          Create
        </button>
      </div>
    </div>
  );
}

function AboutDialog() {
  return (
    <div className="p-5">
      <div className="text-2xl font-black tracking-[0.2em] text-[#f5a623]">WATCHOUT</div>
      <div className="mt-1 text-stone-400">WATCHIN Producer 7.8 — browser edition</div>
      <p className="mt-3 text-[12px] leading-relaxed text-stone-400">
        Multi-display show composer with Stage, Timeline, Assets, Devices, Nodes, Variables and Cue control.
        Producer authors the show. A local Director and Runner simulate networked playback in this session.
      </p>
      <div className="mt-4 text-right">
        <button className="rounded bg-[#f5a623] px-3 py-1 text-black" onClick={() => useApp.getState().setDialog(null)}>
          Close
        </button>
      </div>
    </div>
  );
}

function OpenDialog() {
  return (
    <div className="p-4">
      <div className="mb-3 font-semibold">Open show</div>
      <p className="text-[12px] text-stone-400">Use File → Open to load a .watch.json file, or CONNECT for the last local save.</p>
      <div className="mt-4 text-right">
        <button className="rounded bg-[#f5a623] px-3 py-1 text-black" onClick={() => useApp.getState().setDialog(null)}>
          OK
        </button>
      </div>
    </div>
  );
}

function NdiDialog() {
  const [url, setUrl] = useState("");
  return (
    <div className="p-4">
      <div className="mb-2 text-sm font-semibold text-[#f5a623]">NDI / live input</div>
      <p className="mb-3 text-[12px] text-stone-400">
        Browsers cannot speak native NDI. Bind this input to a camera, a screen share, or an HTTP/WebRTC-style video URL. The Stage treats it as an NDI capture source.
      </p>
      <div className="flex gap-2">
        <button
          className="rounded bg-[#14532d] px-2 py-1 text-emerald-100"
          onClick={() => {
            const id = useApp.getState().ensureNdiAsset();
            if (id) void useApp.getState().connectLiveSource(id, "camera");
            useApp.getState().setDialog(null);
          }}
        >
          Camera
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
      <L label="Stream URL">
        <input value={url} placeholder="https://…/stream.m3u8 or .mp4" onChange={(e) => setUrl(e.target.value)} />
      </L>
      <div className="mt-4 flex justify-end gap-2">
        <button className="px-3 py-1" onClick={() => useApp.getState().setDialog(null)}>Cancel</button>
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

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-stone-500">{label}</div>
      {children}
    </label>
  );
}

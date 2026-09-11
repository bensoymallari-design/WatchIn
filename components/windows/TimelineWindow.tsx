"use client";

import { useEffect, useMemo, useRef } from "react";
import { useApp, useActiveTimeline } from "@/store/appStore";
import { formatMs } from "@/lib/time";
import { Pause, Play, Square, ZoomIn, ZoomOut, Maximize2, Eye, Lock } from "lucide-react";
import type { Cue } from "@/types/show";

const ROW_H = 28;

export function TimelineWindow() {
  const tl = useActiveTimeline();
  const show = useApp((s) => s.show);
  const zoom = useApp((s) => s.timelineZoom);
  const scroll = useApp((s) => s.timelineScroll);
  const selection = useApp((s) => s.selection);
  const clickJumps = useApp((s) => s.clickJumpsToTime);
  const hoverCueId = useApp((s) => s.hoverCueId);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const state = useApp.getState();
      const next = e.deltaY < 0 ? state.timelineZoom * 1.15 : state.timelineZoom / 1.15;
      state.setTimelineView(Math.max(0.002, Math.min(0.2, next)), state.timelineScroll);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [tl?.id]);

  const pxPerMs = zoom;
  const duration = tl?.duration ?? 60000;
  const width = Math.max(800, duration * pxPerMs + 80);
  const playX = (tl?.playhead ?? 0) * pxPerMs;

  const ticks = useMemo(() => {
    const step = niceStep(80 / pxPerMs);
    const out: number[] = [];
    for (let t = 0; t <= duration; t += step) out.push(t);
    return out;
  }, [duration, pxPerMs]);

  if (!tl || !show) return <div className="p-4 text-stone-500">No timeline</div>;

  const hover = tl.cues.find((c) => c.id === hoverCueId);

  return (
    <div className="flex h-full flex-col bg-[#151515]">
      <div className="flex h-7 items-center gap-2 border-b border-black bg-[#1c1c1c] px-2 text-[11px]">
        <span className="font-semibold text-[#e56dff]">{tl.name}</span>
        <span className="font-mono text-stone-300">{formatMs(tl.playhead)}</span>
        <span className={`rounded px-1.5 text-[10px] ${tl.playback === "play" ? "bg-emerald-700 text-white" : tl.playback === "pause" ? "bg-amber-700" : "bg-[#333] text-stone-400"}`}>
          {tl.playback.toUpperCase()}
        </span>
        <button className="rounded bg-emerald-700 px-2 py-0.5 text-white hover:bg-emerald-600" onClick={() => useApp.getState().setPlayback(tl.id, "play")}>
          Play
        </button>
        <button className="rounded bg-[#333] px-2 py-0.5 hover:bg-[#444]" onClick={() => useApp.getState().setPlayback(tl.id, "pause")}>
          Pause
        </button>
        <button className="rounded bg-[#333] px-2 py-0.5 hover:bg-[#444]" onClick={() => useApp.getState().setPlayback(tl.id, "stop")}>
          Stop
        </button>
        {hover && (
          <span className="ml-4 truncate text-stone-400">
            {hover.name}  ·  {formatMs(hover.start)}  ·  {formatMs(hover.duration)}  ·  {hover.id.slice(-6)}
          </span>
        )}
        <span className="ml-auto text-stone-500">{tl.cues.length} cues</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-[148px] shrink-0 border-r border-black bg-[#1a1a1a]">
          <div className="h-6 border-b border-black text-[10px] leading-6 text-stone-500">
            <span className="px-2">Layers</span>
          </div>
          {tl.layers.map((layer, i) => (
            <div
              key={layer.id}
              className="flex items-center gap-1 border-b border-[#222] px-1 text-[11px]"
              style={{ height: ROW_H }}
            >
              <span className="w-4 text-stone-600">{i + 1}</span>
              <input
                className="min-w-0 flex-1 border-none bg-transparent px-1"
                value={layer.name}
                onChange={(e) => useApp.getState().updateLayer(layer.id, { name: e.target.value })}
              />
              <button className={layer.enabled ? "text-stone-300" : "text-stone-600"} onClick={() => useApp.getState().updateLayer(layer.id, { enabled: !layer.enabled })}>
                <Eye size={11} />
              </button>
              <button className={layer.locked ? "text-amber-400" : "text-stone-600"} onClick={() => useApp.getState().updateLayer(layer.id, { locked: !layer.locked })}>
                <Lock size={11} />
              </button>
            </div>
          ))}
        </div>
        <div
          ref={areaRef}
          className="relative min-w-0 flex-1 overflow-auto"
          onScroll={(e) => useApp.getState().setTimelineView(undefined, (e.target as HTMLDivElement).scrollLeft)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const assetId = e.dataTransfer.getData("text/asset");
            if (!assetId || !areaRef.current) return;
            const rect = areaRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left + areaRef.current.scrollLeft - 0;
            const y = e.clientY - rect.top + areaRef.current.scrollTop - 24;
            const start = Math.max(0, x / pxPerMs);
            const layer = tl.layers[Math.max(0, Math.min(tl.layers.length - 1, Math.floor(y / ROW_H)))];
            useApp.getState().addCueFromAsset(assetId, layer?.id, start);
          }}
        >
          <div style={{ width, height: 24 + tl.layers.length * ROW_H + 48 }} className="relative">
            <div className="sticky top-0 z-10 h-6 border-b border-black bg-[#1d1d1d]">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute top-0 h-6 border-l border-[#333] pl-1 font-mono text-[10px] text-stone-500"
                  style={{ left: t * pxPerMs }}
                >
                  {formatMs(t).slice(3, 8)}
                </span>
              ))}
              <div
                className="absolute top-0 h-6 w-full cursor-ew-resize"
                onPointerDown={(e) => {
                  const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  const set = (clientX: number) => {
                    const x = clientX - rect.left + (areaRef.current?.scrollLeft ?? 0);
                    useApp.getState().setPlayhead(tl.id, x / pxPerMs);
                  };
                  set(e.clientX);
                  const move = (ev: PointerEvent) => set(ev.clientX);
                  const up = () => {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
              />
            </div>
            {tl.layers.map((layer, i) => (
              <div
                key={layer.id}
                className="absolute left-0 right-0 border-b border-[#222]"
                style={{ top: 24 + i * ROW_H, height: ROW_H, background: i % 2 ? "#161616" : "#141414" }}
              />
            ))}
            {tl.cues.map((cue) => {
              const li = tl.layers.findIndex((l) => l.id === cue.layerId);
              if (li < 0) return null;
              return (
                <CueBar
                  key={cue.id}
                  cue={cue}
                  top={24 + li * ROW_H + 3}
                  pxPerMs={pxPerMs}
                  selected={selection.kind === "cue" && selection.ids.includes(cue.id)}
                  onSelect={(additive) => {
                    const ids = additive && selection.kind === "cue" ? [...new Set([...selection.ids, cue.id])] : [cue.id];
                    useApp.getState().select({ kind: "cue", ids });
                    if (clickJumps) useApp.getState().setPlayhead(tl.id, cue.start);
                  }}
                />
              );
            })}
            <div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-[#e56dff]" style={{ left: playX }}>
              <div className="absolute -left-[5px] top-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#e56dff]" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-8 items-center gap-2 border-t border-black bg-[#1a1a1a] px-2">
        <button className="grid h-6 w-6 place-items-center rounded bg-emerald-700 hover:bg-emerald-600" onClick={() => useApp.getState().setPlayback(tl.id, "play")} aria-label="Play">
          <Play size={12} fill="currentColor" />
        </button>
        <button className="grid h-6 w-6 place-items-center rounded bg-[#333] hover:bg-[#444]" onClick={() => useApp.getState().setPlayback(tl.id, "pause")} aria-label="Pause">
          <Pause size={12} />
        </button>
        <button className="grid h-6 w-6 place-items-center rounded bg-[#333] hover:bg-[#444]" onClick={() => useApp.getState().setPlayback(tl.id, "stop")} aria-label="Stop">
          <Square size={10} fill="currentColor" />
        </button>
        <label className="ml-2 flex items-center gap-1 text-[11px] text-stone-400">
          <input type="checkbox" checked={tl.loop} onChange={(e) => useApp.getState().updateTimeline(tl.id, { loop: e.target.checked })} />
          Loop
        </label>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => useApp.getState().setTimelineView(zoom / 1.25, scroll)}><ZoomOut size={13} /></button>
          <button onClick={() => useApp.getState().setTimelineView(zoom * 1.25, scroll)}><ZoomIn size={13} /></button>
          <button onClick={() => useApp.getState().setTimelineView(Math.max(0.004, 900 / Math.max(1, duration)), 0)}><Maximize2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function CueBar({
  cue,
  top,
  pxPerMs,
  selected,
  onSelect,
}: {
  cue: Cue;
  top: number;
  pxPerMs: number;
  selected: boolean;
  onSelect: (additive: boolean) => void;
}) {
  const w = Math.max(cue.type === "marker" ? 8 : 18, cue.duration * pxPerMs);
  const left = cue.start * pxPerMs;
  return (
    <div
      className={`absolute z-[5] overflow-hidden rounded-sm border text-[10px] leading-[22px] ${
        selected ? "border-[#f5a623] ring-1 ring-[#f5a623]" : "border-black/50"
      } ${!cue.enabled ? "cue-stripe opacity-50" : ""}`}
      style={{
        left,
        top,
        width: w,
        height: 22,
        background: cue.color,
        color: "#fff",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey || e.ctrlKey);
        useApp.getState().setHoverCue(cue.id);
        const startX = e.clientX;
        const orig = cue.start;
        const origDur = cue.duration;
        const edge = e.nativeEvent.offsetX < 6 ? "l" : e.nativeEvent.offsetX > w - 6 ? "r" : "m";
        const move = (ev: PointerEvent) => {
          const dms = (ev.clientX - startX) / pxPerMs;
          if (edge === "m") useApp.getState().updateCue(cue.id, { start: Math.max(0, orig + dms) });
          if (edge === "r") useApp.getState().resizeCue(cue.id, orig, origDur + dms);
          if (edge === "l") useApp.getState().resizeCue(cue.id, orig + dms, origDur - dms);
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
      onMouseEnter={() => useApp.getState().setHoverCue(cue.id)}
      title={cue.name}
    >
      <span className="px-1.5">{cue.type === "marker" ? "◆" : cue.name}</span>
    </div>
  );
}

function niceStep(ms: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(ms, 1))));
  const r = ms / mag;
  if (r < 1.5) return mag;
  if (r < 3.5) return 2 * mag;
  if (r < 7.5) return 5 * mag;
  return 10 * mag;
}

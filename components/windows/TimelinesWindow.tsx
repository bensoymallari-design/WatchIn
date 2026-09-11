"use client";

import { useApp, useActiveTimeline } from "@/store/appStore";
import { formatMs } from "@/lib/time";
import { Pause, Play, Square, Plus } from "lucide-react";

export function TimelinesWindow() {
  const show = useApp((s) => s.show);
  const activeId = useApp((s) => s.activeTimelineId);
  if (!show) return null;
  return (
    <div className="flex h-full flex-col bg-[#1a1a1a]">
      <div className="flex items-center justify-between border-b border-black px-2 py-1 text-[11px] text-stone-400">
        <span>{show.timelines.length} timelines</span>
        <button className="inline-flex items-center gap-1 hover:text-[#f5a623]" onClick={() => useApp.getState().addTimeline()}>
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {show.timelines.map((t) => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              className={`flex w-full items-center gap-2 border-b border-[#222] px-2 py-1.5 text-left ${
                active ? "bg-[#3b2a12] text-[#f5a623]" : "hover:bg-white/5"
              }`}
              onClick={() => useApp.getState().setActiveTimeline(t.id)}
              onDoubleClick={() => useApp.getState().focusWindow("timeline")}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  t.playback === "play" ? "bg-emerald-400" : t.playback === "pause" ? "bg-amber-300" : "bg-stone-600"
                }`}
              />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="font-mono text-[10px] text-stone-500">{formatMs(t.playhead)}</span>
              <span className="flex gap-0.5">
                <Mini icon={<Play size={10} />} onClick={() => useApp.getState().setPlayback(t.id, "play")} />
                <Mini icon={<Pause size={10} />} onClick={() => useApp.getState().setPlayback(t.id, "pause")} />
                <Mini icon={<Square size={10} />} onClick={() => useApp.getState().setPlayback(t.id, "stop")} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Mini({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <span
      className="grid h-5 w-5 place-items-center rounded hover:bg-white/10"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
    </span>
  );
}

export function useTL() {
  return useActiveTimeline();
}

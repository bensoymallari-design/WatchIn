"use client";

import { useRef } from "react";
import { useApp } from "@/store/appStore";
import { formatMs } from "@/lib/time";
import { FolderPlus, Image as ImageIcon, Film, Music, Radio, Box } from "lucide-react";
import type { Asset } from "@/types/show";

export function AssetsWindow() {
  const show = useApp((s) => s.show);
  const selection = useApp((s) => s.selection);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!show) return null;
  const selected = selection.kind === "asset" ? selection.ids : [];
  const preview = show.assets.find((a) => a.id === selected[0]);

  return (
    <div className="flex h-full flex-col bg-[#171717]">
      <div className="flex items-center gap-2 border-b border-black px-2 py-1 text-[11px]">
        <button className="rounded bg-[#f5a623] px-2 py-0.5 text-black" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <span className="text-stone-500">{show.assets.length} assets</span>
        <span className="ml-auto text-stone-600">Asset Manager · {show.assetManager}</span>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) void useApp.getState().importAssets(files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_140px]">
        <div className="overflow-auto">
          {show.assets.map((a) => (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/asset", a.id);
                useApp.getState().setDraggingAsset(a.id);
              }}
              onDragEnd={() => useApp.getState().setDraggingAsset(null)}
              onClick={() => useApp.getState().select({ kind: "asset", ids: [a.id] })}
              onDoubleClick={() => useApp.getState().addCueFromAsset(a.id)}
              className={`flex cursor-grab items-center gap-2 border-b border-[#222] px-2 py-1.5 ${
                selected.includes(a.id) ? "bg-[#3b2a12]" : "hover:bg-white/5"
              }`}
            >
              <KindIcon kind={a.kind} />
              <div className="min-w-0 flex-1">
                <div className="truncate">{a.name}</div>
                <div className="text-[10px] text-stone-500">
                  {a.kind} · {a.codec} · {a.width ? `${a.width}×${a.height}` : ""} · {formatMs(a.duration)}
                </div>
              </div>
              <span className={`h-2 w-2 rounded-full ${a.optimized ? "bg-emerald-400" : "bg-amber-400"}`} />
            </div>
          ))}
          {show.assets.length === 0 && (
            <div className="p-6 text-center text-stone-500">
              Import images, video or audio — then drag onto the Timeline or Stage.
            </div>
          )}
        </div>
        <div className="border-l border-black p-2">
          <div className="checker mb-2 grid aspect-video place-items-center overflow-hidden rounded border border-[#333]">
            {preview?.url && !preview.url.startsWith("procedural:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[10px] text-stone-500">{preview?.kind ?? "preview"}</span>
            )}
          </div>
          {preview && <div className="text-[10px] leading-relaxed text-stone-400">{preview.notes || preview.name}</div>}
        </div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: Asset["kind"] }) {
  const cls = "shrink-0 text-[#f5a623]";
  if (kind === "video") return <Film size={14} className={cls} />;
  if (kind === "audio") return <Music size={14} className={cls} />;
  if (kind === "ndi" || kind === "capture") return <Radio size={14} className={cls} />;
  if (kind === "composition") return <Box size={14} className={cls} />;
  if (kind === "procedural") return <FolderPlus size={14} className={cls} />;
  return <ImageIcon size={14} className={cls} />;
}

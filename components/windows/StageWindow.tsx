"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/store/appStore";
import { evaluateCue } from "@/lib/tweens";
import { drawStage, screenToStage } from "@/lib/renderStage";
import { Minus, Plus, Focus, Grid3x3 } from "lucide-react";

export function StageWindow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const show = useApp((s) => s.show);
  const camera = useApp((s) => s.camera);
  const draggingAssetId = useApp((s) => s.draggingAssetId);

  useEffect(() => {
    let raf = 0;
    const paint = () => {
      const canvas = canvasRef.current;
      const state = useApp.getState();
      const current = state.show;
      if (canvas && current) {
        const cues = current.timelines
          .filter((t) => t.enabled)
          .flatMap((t) => {
            const ordered = [...t.layers].reverse();
            return ordered.flatMap((layer) => {
              if (!layer.enabled) return [];
              return t.cues
                .filter((c) => c.layerId === layer.id)
                .map((c) => evaluateCue(c, t.playhead))
                .filter((x): x is NonNullable<typeof x> => !!x);
            });
          });
        drawStage({
          canvas,
          displays: current.displays,
          cues,
          assets: current.assets,
          camera: state.camera,
          selectedIds: state.selection.ids,
          timeMs: performance.now(),
          showGrid: true,
        });
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!show) return null;

  return (
    <div className="relative flex h-full flex-col bg-[#101010]">
      <div className="flex h-7 items-center gap-1 border-b border-black bg-[#1a1a1a] px-2 text-[11px] text-stone-400">
        <Tool icon={<Plus size={12} />} onClick={() => useApp.getState().setCamera({ zoom: camera.zoom * 1.2 })} />
        <Tool icon={<Minus size={12} />} onClick={() => useApp.getState().setCamera({ zoom: camera.zoom / 1.2 })} />
        <Tool icon={<Focus size={12} />} onClick={() => useApp.getState().frameDisplays()} />
        <Tool
          icon={<Grid3x3 size={12} />}
          onClick={() => useApp.getState().setDialog("displayGrid")}
        />
        <span className="ml-2">Stage px  ·  zoom {(camera.zoom * 100).toFixed(0)}%</span>
        <span className="ml-auto">
          {show.displays.length} displays  ·  {show.displays.reduce((n, d) => n + d.width, 0)}×
          {Math.max(...show.displays.map((d) => d.height), 0)}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
          useApp.getState().setCamera({ zoom: Math.max(0.02, Math.min(4, camera.zoom * factor)) });
        }}
        onPointerDown={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const pt = screenToStage(canvas, camera, e.clientX, e.clientY);
          const hitDisplay = [...show.displays].reverse().find(
            (d) => pt.x >= d.x && pt.x <= d.x + d.width && pt.y >= d.y && pt.y <= d.y + d.height,
          );
          if (hitDisplay) {
            useApp.getState().select({ kind: "display", ids: [hitDisplay.id] });
            useApp.getState().focusWindow("properties");
          } else {
            useApp.getState().clearSelection();
          }
          const origin = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
          const move = (ev: PointerEvent) => {
            const dx = (ev.clientX - origin.x) / camera.zoom;
            const dy = (ev.clientY - origin.y) / camera.zoom;
            useApp.getState().setCamera({ x: origin.cx - dx, y: origin.cy - dy });
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const canvas = canvasRef.current;
          if (!canvas) return;
          const pt = screenToStage(canvas, camera, e.clientX, e.clientY);
          const assetId = e.dataTransfer.getData("text/asset") || draggingAssetId;
          if (assetId) useApp.getState().addCueFromAsset(assetId, undefined, undefined, pt);
        }}
      />
    </div>
  );
}

function Tool({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <button className="grid h-5 w-5 place-items-center rounded hover:bg-white/10" onClick={onClick}>
      {icon}
    </button>
  );
}

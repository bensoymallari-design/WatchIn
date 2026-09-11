"use client";

import { useApp, useActiveTimeline } from "@/store/appStore";
import { formatMs } from "@/lib/time";
import { TWEEN_META } from "@/lib/tweens";
import type { Cue, Display } from "@/types/show";

export function PropertiesWindow() {
  const show = useApp((s) => s.show);
  const selection = useApp((s) => s.selection);
  const tl = useActiveTimeline();
  if (!show) return null;

  if (selection.kind === "cue" && selection.ids[0] && tl) {
    const cue = show.timelines.flatMap((t) => t.cues).find((c) => c.id === selection.ids[0]);
    if (cue) return <CueProps cue={cue} />;
  }
  if (selection.kind === "display" && selection.ids[0]) {
    const d = show.displays.find((x) => x.id === selection.ids[0]);
    if (d) return <DisplayProps display={d} />;
  }
  if (selection.kind === "asset" && selection.ids[0]) {
    const a = show.assets.find((x) => x.id === selection.ids[0]);
    if (a) {
      return (
        <Panel title="Asset">
          <Field label="Name" value={a.name} onChange={(v) => useApp.getState().updateAsset(a.id, { name: v })} />
          <Read label="Kind" value={a.kind} />
          <Read label="Codec" value={a.codec} />
          <Read label="Size" value={`${a.width}×${a.height}`} />
          <Read label="Duration" value={formatMs(a.duration)} />
          <Read label="Notes" value={a.notes || "—"} />
        </Panel>
      );
    }
  }
  if (selection.kind === "timeline" && tl) {
    return (
      <Panel title="Timeline">
        <Field label="Name" value={tl.name} onChange={(v) => useApp.getState().updateTimeline(tl.id, { name: v })} />
        <Num label="Duration ms" value={tl.duration} onChange={(v) => useApp.getState().updateTimeline(tl.id, { duration: v })} />
        <Num label="Rate" value={tl.rate} step={0.1} onChange={(v) => useApp.getState().updateTimeline(tl.id, { rate: v })} />
        <Check label="Loop" checked={tl.loop} onChange={(v) => useApp.getState().updateTimeline(tl.id, { loop: v })} />
        <Check label="Enabled" checked={tl.enabled} onChange={(v) => useApp.getState().updateTimeline(tl.id, { enabled: v })} />
      </Panel>
    );
  }

  return (
    <Panel title="Show Preferences">
      <Field label="Show name" value={show.name} onChange={(v) => useApp.getState().setShowName(v)} />
      <Num label="Frame rate" value={show.prefs.fps} onChange={(v) => useApp.getState().updateShowPrefs({ fps: v })} />
      <Num label="Image duration ms" value={show.prefs.imageDuration} onChange={(v) => useApp.getState().updateShowPrefs({ imageDuration: v })} />
      <Check label="Auto fade" checked={show.prefs.autoFade} onChange={(v) => useApp.getState().updateShowPrefs({ autoFade: v })} />
      <Num label="Fade in ms" value={show.prefs.fadeIn} onChange={(v) => useApp.getState().updateShowPrefs({ fadeIn: v })} />
      <Num label="Fade out ms" value={show.prefs.fadeOut} onChange={(v) => useApp.getState().updateShowPrefs({ fadeOut: v })} />
      <Read label="Director" value={show.director} />
      <Read label="Asset Manager" value={show.assetManager} />
      <Read label="Cues" value={String(show.timelines.reduce((n, t) => n + t.cues.length, 0))} />
      <Read label="Displays" value={String(show.displays.length)} />
      <Read label="Assets" value={String(show.assets.length)} />
      <Read label="Created" value={new Date(show.createdAt).toLocaleString()} />
    </Panel>
  );
}

function CueProps({ cue }: { cue: Cue }) {
  const u = (partial: Partial<Cue>) => useApp.getState().updateCue(cue.id, partial);
  return (
    <Panel title={`${cue.type} cue`}>
      <Field label="Name" value={cue.name} onChange={(v) => u({ name: v })} />
      <Read label="ID" value={cue.id} />
      <Num label="Start ms" value={Math.round(cue.start)} onChange={(v) => u({ start: v })} />
      <Num label="Duration ms" value={Math.round(cue.duration)} onChange={(v) => u({ duration: v })} />
      <Check label="Enabled" checked={cue.enabled} onChange={(v) => u({ enabled: v })} />
      <Check label="Free running" checked={cue.freeRunning} onChange={(v) => u({ freeRunning: v })} />
      <Num label="Position X" value={cue.position.x} onChange={(v) => u({ position: { ...cue.position, x: v } })} />
      <Num label="Position Y" value={cue.position.y} onChange={(v) => u({ position: { ...cue.position, y: v } })} />
      <Num label="Scale X %" value={cue.scale.x} onChange={(v) => u({ scale: { ...cue.scale, x: v } })} />
      <Num label="Scale Y %" value={cue.scale.y} onChange={(v) => u({ scale: { ...cue.scale, y: v } })} />
      <Num label="Rotation Z" value={cue.rotation.z} onChange={(v) => u({ rotation: { ...cue.rotation, z: v } })} />
      <Num label="Opacity" value={cue.opacity} onChange={(v) => u({ opacity: v })} />
      <Num label="Volume" value={cue.volume} onChange={(v) => u({ volume: v })} />
      {cue.control && (
        <>
          <Read label="Control" value={`${cue.control.state} → ${cue.control.target}`} />
        </>
      )}
      {cue.output && <Read label="Output" value={`${cue.output.protocol} ${cue.output.address}`} />}
      <div className="mt-2 text-[10px] uppercase tracking-wider text-stone-500">Tweens</div>
      {cue.tweens.length === 0 && <div className="text-stone-600">None — add from Effect menu</div>}
      {cue.tweens.map((tw) => (
        <div key={tw.id} className="mt-1 rounded border border-[#333] p-1">
          <div className="flex items-center justify-between">
            <span style={{ color: TWEEN_META[tw.type].color }}>{TWEEN_META[tw.type].label}</span>
            <span className="text-stone-500">{tw.points.length} pts</span>
          </div>
        </div>
      ))}
    </Panel>
  );
}

function DisplayProps({ display }: { display: Display }) {
  const u = (partial: Partial<Display>) => useApp.getState().updateDisplay(display.id, partial);
  return (
    <Panel title="Display">
      <Field label="Name" value={display.name} onChange={(v) => u({ name: v })} />
      <Num label="X" value={display.x} onChange={(v) => u({ x: v })} />
      <Num label="Y" value={display.y} onChange={(v) => u({ y: v })} />
      <Num label="Width" value={display.width} onChange={(v) => u({ width: v })} />
      <Num label="Height" value={display.height} onChange={(v) => u({ height: v })} />
      <Num label="Rotation" value={display.rotation} onChange={(v) => u({ rotation: v })} />
      <label className="grid grid-cols-[92px_1fr] items-center gap-2 py-0.5">
        <span className="text-stone-500">Output</span>
        <select value={display.outputType} onChange={(e) => u({ outputType: e.target.value as Display["outputType"] })}>
          <option>GPU</option>
          <option>SDI</option>
          <option>NDI</option>
          <option>Virtual</option>
        </select>
      </label>
      <Num label="Channel" value={display.channel} onChange={(v) => u({ channel: v })} />
      <Check label="Enabled" checked={display.enabled} onChange={(v) => u({ enabled: v })} />
      <Check label="Soft-edge blend" checked={display.blend} onChange={(v) => u({ blend: v })} />
      <Num label="Blend width" value={display.blendWidth} onChange={(v) => u({ blendWidth: v })} />
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-auto bg-[#181818] p-2">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f5a623]">{title}</div>
      <div className="space-y-0.5 text-[12px]">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid grid-cols-[92px_1fr] items-center gap-2 py-0.5">
      <span className="text-stone-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="grid grid-cols-[92px_1fr] items-center gap-2 py-0.5">
      <span className="text-stone-500">{label}</span>
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 py-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Read({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2 py-0.5">
      <span className="text-stone-500">{label}</span>
      <span className="truncate text-stone-300">{value}</span>
    </div>
  );
}

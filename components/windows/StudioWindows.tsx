"use client";

import { useApp } from "@/store/appStore";

export function DevicesWindow() {
  const show = useApp((s) => s.show);
  if (!show) return null;
  return (
    <div className="h-full overflow-auto bg-[#171717] text-[12px]">
      <Section title="Displays">
        {show.displays.map((d) => (
          <button
            key={d.id}
            className="flex w-full items-center justify-between border-b border-[#222] px-3 py-1.5 text-left hover:bg-white/5"
            onClick={() => useApp.getState().select({ kind: "display", ids: [d.id] })}
          >
            <span>{d.name}</span>
            <span className="text-stone-500">
              {d.outputType}:{d.channel} · {d.width}×{d.height} · {d.nodeId}
            </span>
          </button>
        ))}
      </Section>
      <Section title="Audio">
        {show.audioDevices.map((d) => (
          <div key={d.id} className="flex justify-between border-b border-[#222] px-3 py-1.5">
            <span>{d.name}</span>
            <span className="text-stone-500">
              {d.driver} · {d.channels} ch
            </span>
          </div>
        ))}
      </Section>
      <Section title="Capture">
        {show.captureDevices.map((d) => (
          <div key={d.id} className="flex justify-between border-b border-[#222] px-3 py-1.5">
            <span>{d.name}</span>
            <span className="text-stone-500">
              {d.kind} · {d.signal}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

export function NodesWindow() {
  const show = useApp((s) => s.show);
  if (!show) return null;
  return (
    <div className="h-full overflow-auto bg-[#171717] p-2">
      {show.nodes.map((n) => (
        <div key={n.id} className="mb-2 rounded border border-[#333] bg-[#1c1c1c] p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{n.name}</div>
            <span className={`text-[11px] ${n.online ? "text-emerald-400" : "text-red-400"}`}>
              {n.online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            {n.address} · {n.gpu} · v{n.version}
          </div>
          <div className="mt-2 flex gap-2 text-[10px]">
            {n.services.producer && <Tag>Producer</Tag>}
            {n.services.director && <Tag>Director</Tag>}
            {n.services.runner && <Tag>Runner</Tag>}
            {n.services.assetManager && <Tag>Asset Manager</Tag>}
          </div>
          <Meters cpu={n.cpu} gpu={n.gpuLoad} ram={n.ram} disk={n.disk} />
        </div>
      ))}
    </div>
  );
}

export function VariablesWindow() {
  const show = useApp((s) => s.show);
  if (!show) return null;
  return (
    <div className="flex h-full flex-col bg-[#171717]">
      <div className="flex justify-end border-b border-black p-1">
        <button className="rounded bg-[#f5a623] px-2 py-0.5 text-black" onClick={() => useApp.getState().addVariable()}>
          Add variable
        </button>
      </div>
      <div className="overflow-auto">
        {show.variables.map((v) => (
          <div key={v.id} className="grid grid-cols-[1fr_80px_1fr] items-center gap-2 border-b border-[#222] px-3 py-2">
            <input value={v.name} onChange={(e) => useApp.getState().updateVariable(v.id, { name: e.target.value })} />
            <input
              type="number"
              value={v.value}
              onChange={(e) => useApp.getState().updateVariable(v.id, { value: Number(e.target.value) })}
            />
            <div className="text-[11px] text-stone-500">
              {v.protocol} {v.address}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CuesWindow() {
  const show = useApp((s) => s.show);
  if (!show) return null;
  const rows = show.timelines.flatMap((t) => t.cues.map((c) => ({ t, c })));
  return (
    <div className="h-full overflow-auto bg-[#171717] text-[12px]">
      <div className="grid grid-cols-[1.2fr_1fr_90px_90px_80px] border-b border-black bg-[#222] px-2 py-1 text-[10px] uppercase tracking-wide text-stone-500">
        <span>Name</span><span>Timeline</span><span>Start</span><span>Dur</span><span>Type</span>
      </div>
      {rows.map(({ t, c }) => (
        <button
          key={c.id}
          className="grid w-full grid-cols-[1.2fr_1fr_90px_90px_80px] border-b border-[#222] px-2 py-1 text-left hover:bg-white/5"
          onClick={() => {
            useApp.getState().setActiveTimeline(t.id);
            useApp.getState().select({ kind: "cue", ids: [c.id] });
            useApp.getState().setPlayhead(t.id, c.start);
          }}
        >
          <span className="truncate">{c.name}</span>
          <span className="truncate text-stone-500">{t.name}</span>
          <span className="font-mono text-stone-400">{Math.round(c.start)}</span>
          <span className="font-mono text-stone-400">{Math.round(c.duration)}</span>
          <span style={{ color: c.color }}>{c.type}</span>
        </button>
      ))}
    </div>
  );
}

export function CueSetsWindow() {
  const show = useApp((s) => s.show);
  if (!show) return null;
  return (
    <div className="h-full overflow-auto bg-[#171717] p-2">
      {show.cueSets.map((s) => (
        <div key={s.id} className="mb-2 rounded border border-[#333] p-3">
          <div className="font-semibold">{s.name}</div>
          <div className="text-[11px] text-stone-500">{s.cueIds.length} cues · {s.enabled ? "enabled" : "disabled"}</div>
        </div>
      ))}
    </div>
  );
}

export function LogWindow() {
  const logs = useApp((s) => s.logs);
  return (
    <div className="h-full overflow-auto bg-black font-mono text-[11px]">
      {logs.map((l) => (
        <div key={l.id} className="border-b border-[#1a1a1a] px-2 py-1">
          <span className="text-stone-600">{new Date(l.ts).toLocaleTimeString()}</span>{" "}
          <span className={l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-300" : "text-emerald-300"}>
            {l.level.toUpperCase()}
          </span>{" "}
          {l.message}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-[#222] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-stone-500">{title}</div>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-[#f5a623]/20 px-1.5 py-0.5 text-[#f5a623]">{children}</span>;
}

function Meters({ cpu, gpu, ram, disk }: { cpu: number; gpu: number; ram: number; disk: number }) {
  return (
    <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-stone-400">
      <Bar label="CPU" v={cpu} />
      <Bar label="GPU" v={gpu} />
      <Bar label="RAM" v={ram} />
      <Bar label="DISK" v={disk} />
    </div>
  );
}

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div>{label} {v}%</div>
      <div className="mt-0.5 h-1 bg-[#333]">
        <div className="h-1 bg-[#f5a623]" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

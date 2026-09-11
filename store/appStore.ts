import { create } from "zustand";
import type {
  Asset,
  Cue,
  DialogKind,
  Display,
  Selection,
  Show,
  Timeline,
  TweenType,
  WindowId,
  WindowLayout,
} from "@/types/show";
import { defaultLayout, liveLayout, programmingLayout } from "@/lib/layout";
import { uid } from "@/lib/ids";
import { emptyCue, emptyDisplay, emptyLayer, emptyShow, emptyTimeline, emptyAsset, makeDemoShow } from "@/lib/showFactory";
import { fadeTweens, makeTween } from "@/lib/tweens";
import { connectCamera, connectScreen, connectUrl } from "@/lib/liveSources";
import { downloadShow, loadLayouts, loadRecents, loadShowLocal, saveLayouts, saveShowLocal, type RecentShow } from "@/lib/persistence";

export interface LogEntry {
  id: string;
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
}

type MenuName = "file" | "edit" | "stage" | "timeline" | "effect" | "window" | "help" | null;

interface AppState {
  view: "welcome" | "producer";
  show: Show | null;
  recents: RecentShow[];
  selection: Selection;
  activeTimelineId: string | null;
  windows: WindowLayout[];
  presets: Record<number, WindowLayout[]>;
  focusedWindow: WindowId;
  camera: { x: number; y: number; zoom: number };
  logs: LogEntry[];
  dialog: DialogKind;
  menu: MenuName;
  snap: boolean;
  clickJumpsToTime: boolean;
  legacyKeyboard: boolean;
  messagesOpen: boolean;
  directorOpen: boolean;
  assetMgrOpen: boolean;
  timelineZoom: number;
  timelineScroll: number;
  hoverCueId: string | null;
  history: string[];
  future: string[];
  draggingAssetId: string | null;
  fpsNow: number;
  liveTick: number;
}

interface AppActions {
  boot: () => void;
  log: (message: string, level?: LogEntry["level"]) => void;
  setMenu: (menu: MenuName) => void;
  setDialog: (dialog: DialogKind) => void;
  newShow: () => void;
  openDemo: () => void;
  openLocal: () => void;
  openFile: (file: File) => Promise<void>;
  save: () => void;
  saveDownload: () => void;
  quitToWelcome: () => void;
  setShowName: (name: string) => void;
  undo: () => void;
  redo: () => void;
  select: (selection: Selection) => void;
  clearSelection: () => void;
  setActiveTimeline: (id: string) => void;
  focusWindow: (id: WindowId) => void;
  toggleWindow: (id: WindowId, open?: boolean) => void;
  moveWindow: (id: WindowId, x: number, y: number) => void;
  resizeWindow: (id: WindowId, w: number, h: number, x?: number, y?: number) => void;
  resetLayout: () => void;
  savePreset: (n: number) => void;
  loadPreset: (n: number) => void;
  loadLiveLayout: () => void;
  loadProgrammingLayout: () => void;
  setCamera: (partial: Partial<AppState["camera"]>) => void;
  frameDisplays: () => void;
  setTimelineView: (zoom?: number, scroll?: number) => void;
  setPlayhead: (timelineId: string, ms: number) => void;
  setPlayback: (timelineId: string, state: Timeline["playback"]) => void;
  tickPlayback: (dt: number) => void;
  addLayer: () => void;
  deleteLayer: (id: string) => void;
  updateLayer: (id: string, partial: Partial<Timeline["layers"][number]>) => void;
  addCueFromAsset: (assetId: string, layerId?: string, start?: number, position?: { x: number; y: number }) => void;
  addCueType: (type: Cue["type"]) => void;
  updateCue: (id: string, partial: Partial<Cue>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  moveCues: (ids: string[], dStart: number, layerId?: string) => void;
  resizeCue: (id: string, start: number, duration: number) => void;
  toggleTween: (type: TweenType) => void;
  updateTweenPoint: (cueId: string, tweenId: string, pointId: string, partial: { time?: number; value?: number }) => void;
  addDisplay: (partial?: Partial<Display>) => void;
  addDisplayGrid: (cols: number, rows: number, w: number, h: number, gap: number) => void;
  updateDisplay: (id: string, partial: Partial<Display>) => void;
  importAssets: (files: File[]) => Promise<void>;
  updateAsset: (id: string, partial: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addTimeline: () => void;
  updateTimeline: (id: string, partial: Partial<Timeline>) => void;
  updateShowPrefs: (partial: Partial<Show["prefs"]>) => void;
  updateVariable: (id: string, partial: Partial<Show["variables"][number]>) => void;
  addVariable: () => void;
  setHoverCue: (id: string | null) => void;
  setSnap: (v: boolean) => void;
  setClickJumps: (v: boolean) => void;
  setLegacy: (v: boolean) => void;
  setDraggingAsset: (id: string | null) => void;
  setFpsNow: (n: number) => void;
  toggleMessages: () => void;
  ensureNdiAsset: () => string | null;
  connectLiveSource: (assetId: string, mode: "camera" | "screen" | "url", url?: string) => Promise<void>;
}

function snapshot(show: Show | null) {
  return show ? JSON.stringify(show) : "";
}

function parseShow(raw: string): Show | null {
  try {
    return raw ? (JSON.parse(raw) as Show) : null;
  } catch {
    return null;
  }
}

function patchShow(state: AppState, mutator: (show: Show) => Show, record = true): Partial<AppState> {
  if (!state.show) return {};
  const next = mutator(structuredClone(state.show));
  next.modifiedAt = new Date().toISOString();
  const history = record ? [...state.history.slice(-49), snapshot(state.show)] : state.history;
  return { show: next, history, future: record ? [] : state.future };
}

function activeTimeline(show: Show | null, id: string | null) {
  if (!show) return null;
  return show.timelines.find((t) => t.id === id) ?? show.timelines[0] ?? null;
}

export const useApp = create<AppState & AppActions>((set, get) => ({
  view: "welcome",
  show: null,
  recents: [],
  selection: { kind: "none", ids: [] },
  activeTimelineId: null,
  windows: defaultLayout(),
  presets: {},
  focusedWindow: "stage",
  camera: { x: 2880, y: 540, zoom: 0.18 },
  logs: [],
  dialog: null,
  menu: null,
  snap: true,
  clickJumpsToTime: true,
  legacyKeyboard: false,
  messagesOpen: false,
  directorOpen: false,
  assetMgrOpen: false,
  timelineZoom: 0.012,
  timelineScroll: 0,
  hoverCueId: null,
  history: [],
  future: [],
  draggingAssetId: null,
  fpsNow: 60,
  liveTick: 0,

  boot: () => {
    set({ recents: loadRecents(), presets: loadLayouts({}) });
  },

  log: (message, level = "info") => {
    set((s) => ({
      logs: [{ id: uid("log"), ts: Date.now(), level, message }, ...s.logs].slice(0, 200),
    }));
  },

  setMenu: (menu) => set({ menu }),
  setDialog: (dialog) => set({ dialog, menu: null }),

  newShow: () => {
    const show = emptyShow();
    set({
      view: "producer",
      show,
      activeTimelineId: show.timelines[0].id,
      selection: { kind: "none", ids: [] },
      history: [],
      future: [],
      windows: defaultLayout(),
      camera: { x: 960, y: 540, zoom: 0.28 },
      dialog: null,
      menu: null,
    });
    get().log("New show created with local Director and Asset Manager");
    setTimeout(() => get().frameDisplays(), 40);
  },

  openDemo: () => {
    const show = makeDemoShow();
    show.timelines[0].playhead = 1800;
    set({
      view: "producer",
      show,
      activeTimelineId: show.timelines[0].id,
      selection: { kind: "none", ids: [] },
      history: [],
      future: [],
      windows: defaultLayout(),
      camera: { x: 2880, y: 540, zoom: 0.14 },
      dialog: null,
    });
    get().log("Opened WATCHIN demo show — 3-wide LED wall");
    setTimeout(() => get().frameDisplays(), 40);
  },

  openLocal: () => {
    const show = loadShowLocal();
    if (!show) {
      get().log("No locally saved show", "warn");
      return;
    }
    set({
      view: "producer",
      show,
      activeTimelineId: show.timelines[0]?.id ?? null,
      selection: { kind: "none", ids: [] },
      history: [],
      future: [],
      dialog: null,
    });
    get().log(`Opened ${show.name}`);
  },

  openFile: async (file) => {
    const text = await file.text();
    const show = parseShow(text);
    if (!show) {
      get().log("Could not parse show file", "error");
      return;
    }
    set({
      view: "producer",
      show,
      activeTimelineId: show.timelines[0]?.id ?? null,
      dialog: null,
      history: [],
      future: [],
    });
    get().log(`Opened ${show.name} from disk`);
  },

  save: () => {
    const { show } = get();
    if (!show) return;
    saveShowLocal(show);
    set({ recents: loadRecents() });
    get().log(`Saved ${show.name}`);
  },

  saveDownload: () => {
    const { show } = get();
    if (!show) return;
    downloadShow(show);
    saveShowLocal(show);
    set({ recents: loadRecents() });
    get().log(`Exported ${show.name}.watch.json`);
  },

  quitToWelcome: () => {
    set({ view: "welcome", menu: null, dialog: null });
  },

  setShowName: (name) => set((s) => patchShow(s, (show) => ({ ...show, name }))),

  undo: () => {
    const { history, show, future } = get();
    const prev = history[history.length - 1];
    if (!prev) return;
    set({
      show: parseShow(prev),
      history: history.slice(0, -1),
      future: [snapshot(show), ...future],
    });
  },

  redo: () => {
    const { future, show, history } = get();
    const next = future[0];
    if (!next) return;
    set({
      show: parseShow(next),
      future: future.slice(1),
      history: [...history, snapshot(show)],
    });
  },

  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: { kind: "none", ids: [] } }),
  setActiveTimeline: (id) => set({ activeTimelineId: id, focusedWindow: "timeline" }),

  focusWindow: (id) =>
    set((s) => {
      const maxZ = Math.max(...s.windows.map((w) => w.z), 1);
      return {
        focusedWindow: id,
        windows: s.windows.map((w) => (w.id === id ? { ...w, open: true, z: maxZ + 1 } : w)),
        menu: null,
      };
    }),

  toggleWindow: (id, open) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, open: open ?? !w.open } : w)),
      focusedWindow: open === false ? s.focusedWindow : id,
      menu: null,
    })),

  moveWindow: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x: Math.max(-10, x), y: Math.max(-4, y) } : w)),
    })),

  resizeWindow: (id, w, h, x, y) =>
    set((s) => ({
      windows: s.windows.map((win) =>
        win.id === id
          ? { ...win, w: Math.max(14, w), h: Math.max(12, h), x: x ?? win.x, y: y ?? win.y }
          : win,
      ),
    })),

  resetLayout: () => set({ windows: defaultLayout(), menu: null }),
  savePreset: (n) => {
    const presets = { ...get().presets, [n]: structuredClone(get().windows) };
    saveLayouts(presets);
    set({ presets, menu: null });
    get().log(`Saved layout preset ${n}`);
  },
  loadPreset: (n) => {
    const preset = get().presets[n];
    if (!preset) {
      if (n === 1) set({ windows: programmingLayout(), menu: null });
      else if (n === 2) set({ windows: liveLayout(), menu: null });
      else get().log(`No layout stored in preset ${n}`, "warn");
      return;
    }
    set({ windows: structuredClone(preset), menu: null });
  },
  loadLiveLayout: () => set({ windows: liveLayout(), menu: null }),
  loadProgrammingLayout: () => set({ windows: programmingLayout(), menu: null }),

  setCamera: (partial) => set((s) => ({ camera: { ...s.camera, ...partial } })),
  frameDisplays: () => {
    const { show } = get();
    if (!show || show.displays.length === 0) return;
    const minX = Math.min(...show.displays.map((d) => d.x));
    const minY = Math.min(...show.displays.map((d) => d.y));
    const maxX = Math.max(...show.displays.map((d) => d.x + d.width));
    const maxY = Math.max(...show.displays.map((d) => d.y + d.height));
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const cssW = Math.max(320, window.innerWidth * 0.4);
    const cssH = Math.max(220, (window.innerHeight - 36) * 0.48);
    const zoom = Math.max(0.04, Math.min(1.2, Math.min((cssW - 48) / bw, (cssH - 48) / bh)));
    set({ camera: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom } });
  },

  setTimelineView: (zoom, scroll) =>
    set((s) => ({
      timelineZoom: zoom ?? s.timelineZoom,
      timelineScroll: Math.max(0, scroll ?? s.timelineScroll),
    })),

  setPlayhead: (timelineId, ms) =>
    set((s) =>
      patchShow(
        s,
        (show) => ({
          ...show,
          timelines: show.timelines.map((t) =>
            t.id === timelineId ? { ...t, playhead: Math.max(0, Math.min(t.duration, ms)) } : t,
          ),
        }),
        false,
      ),
    ),

  setPlayback: (timelineId, state) => {
    set((s) =>
      patchShow(
        s,
        (show) => ({
          ...show,
          timelines: show.timelines.map((t) =>
            t.id === timelineId
              ? { ...t, playback: state, playhead: state === "stop" ? 0 : t.playhead }
              : t,
          ),
        }),
        false,
      ),
    );
    const tl = get().show?.timelines.find((t) => t.id === timelineId);
    get().log(`${tl?.name ?? "Timeline"} → ${state.toUpperCase()}`);
  },

  tickPlayback: (dt) => {
    const { show } = get();
    if (!show) return;
    let changed = false;
    const fired: { timelineId: string; cue: Cue }[] = [];
    const nextTimelines = show.timelines.map((t) => {
      if (t.playback !== "play") return t;
      const prev = t.playhead;
      let playhead = t.playhead + dt * t.rate;
      let playback: Timeline["playback"] = t.playback;
      if (playhead >= t.duration) {
        if (t.loop) playhead = playhead % t.duration;
        else {
          playhead = t.duration;
          playback = "pause";
        }
      }
      for (const cue of t.cues) {
        if (cue.type === "control" && cue.enabled && prev < cue.start && playhead >= cue.start) {
          fired.push({ timelineId: t.id, cue });
        }
      }
      changed = true;
      return { ...t, playhead, playback };
    });
    if (!changed && fired.length === 0) return;
    let timelines = nextTimelines;
    for (const { timelineId, cue } of fired) {
      const ctrl = cue.control;
      if (!ctrl) continue;
      const targets =
        ctrl.target === "this"
          ? [timelineId]
          : ctrl.target === "all"
            ? timelines.map((t) => t.id)
            : ctrl.timelineIds;
      timelines = timelines.map((t) => {
        if (!targets.includes(t.id)) return t;
        let playhead = t.playhead;
        if (ctrl.jumpMode === "time") playhead = ctrl.jumpTime;
        if (ctrl.jumpMode === "cue" && ctrl.jumpCueId) {
          const dest = t.cues.find((c) => c.id === ctrl.jumpCueId);
          if (dest) playhead = dest.start;
        }
        return { ...t, playback: ctrl.state, playhead };
      });
      get().log(`Control cue "${cue.name}" → ${ctrl.state}`);
    }
    set({ show: { ...show, timelines } });
  },

  addLayer: () =>
    set((s) =>
      patchShow(s, (show) => {
        const id = s.activeTimelineId;
        return {
          ...show,
          timelines: show.timelines.map((t) =>
            t.id === id ? { ...t, layers: [...t.layers, emptyLayer(`Layer ${t.layers.length + 1}`, t.layers.length + 1)] } : t,
          ),
        };
      }),
    ),

  deleteLayer: (id) =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        timelines: show.timelines.map((t) =>
          t.id === s.activeTimelineId
            ? { ...t, layers: t.layers.filter((l) => l.id !== id), cues: t.cues.filter((c) => c.layerId !== id) }
            : t,
        ),
      })),
    ),

  updateLayer: (id, partial) =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        timelines: show.timelines.map((t) => ({
          ...t,
          layers: t.layers.map((l) => (l.id === id ? { ...l, ...partial } : l)),
        })),
      })),
    ),

  addCueFromAsset: (assetId, layerId, start, position) => {
    set((s) =>
      patchShow(s, (show) => {
        const tl = activeTimeline(show, s.activeTimelineId);
        if (!tl) return show;
        const asset = show.assets.find((a) => a.id === assetId);
        if (!asset) return show;
        const layer = layerId ?? tl.layers.find((l) => !l.locked)?.id ?? tl.layers[0].id;
        const live = asset.kind === "ndi" || asset.kind === "capture";
        const duration = live
          ? Math.max(tl.duration - (start ?? tl.playhead), 10000)
          : asset.kind === "image"
            ? show.prefs.imageDuration
            : asset.duration || 5000;
        const cueStart = start ?? tl.playhead;
        const tweens = !live && show.prefs.autoFade ? fadeTweens(duration, show.prefs.fadeIn, show.prefs.fadeOut) : [];
        const cue = emptyCue({
          name: asset.name,
          type: "media",
          layerId: layer,
          start: cueStart,
          duration,
          assetId,
          color: asset.color,
          position: position ? { x: position.x, y: position.y, z: 0 } : { x: 0, y: 0, z: 0 },
          tweens,
          freeRunning: live,
        });
        return {
          ...show,
          timelines: show.timelines.map((t) => (t.id === tl.id ? { ...t, cues: [...t.cues, cue] } : t)),
        };
      }),
    );
    get().log("Added media cue");
  },

  addCueType: (type) =>
    set((s) =>
      patchShow(s, (show) => {
        const tl = activeTimeline(show, s.activeTimelineId);
        if (!tl) return show;
        const layer = tl.layers.find((l) => !l.locked)?.id ?? tl.layers[0].id;
        const cue = emptyCue({
          type,
          name: type[0].toUpperCase() + type.slice(1) + " cue",
          layerId: layer,
          start: tl.playhead,
          duration: type === "marker" ? 0 : type === "control" || type === "output" ? 200 : 4000,
          control: type === "control" ? { state: "play", target: "this", timelineIds: [tl.id], jumpMode: "none", jumpTime: 0 } : undefined,
          output: type === "output" ? { protocol: "udp", address: "127.0.0.1:7000", message: "GO" } : undefined,
        });
        return {
          ...show,
          timelines: show.timelines.map((t) => (t.id === tl.id ? { ...t, cues: [...t.cues, cue] } : t)),
        };
      }),
    ),

  updateCue: (id, partial) =>
    set((s) =>
      patchShow(
        s,
        (show) => ({
          ...show,
          timelines: show.timelines.map((t) => ({
            ...t,
            cues: t.cues.map((c) => (c.id === id ? { ...c, ...partial } : c)),
          })),
        }),
        false,
      ),
    ),

  deleteSelected: () =>
    set((s) =>
      patchShow(s, (show) => {
        const ids = new Set(s.selection.ids);
        if (s.selection.kind === "cue") {
          return { ...show, timelines: show.timelines.map((t) => ({ ...t, cues: t.cues.filter((c) => !ids.has(c.id)) })) };
        }
        if (s.selection.kind === "display") {
          return { ...show, displays: show.displays.filter((d) => !ids.has(d.id)) };
        }
        if (s.selection.kind === "asset") {
          return { ...show, assets: show.assets.filter((a) => !ids.has(a.id)) };
        }
        return show;
      }),
    ),

  duplicateSelected: () =>
    set((s) =>
      patchShow(s, (show) => {
        if (s.selection.kind !== "cue") return show;
        const ids = new Set(s.selection.ids);
        return {
          ...show,
          timelines: show.timelines.map((t) => ({
            ...t,
            cues: [
              ...t.cues,
              ...t.cues
                .filter((c) => ids.has(c.id))
                .map((c) => ({ ...structuredClone(c), id: uid("cue"), start: c.start + 500, name: c.name + " copy" })),
            ],
          })),
        };
      }),
    ),

  moveCues: (ids, dStart, layerId) =>
    set((s) =>
      patchShow(
        s,
        (show) => ({
          ...show,
          timelines: show.timelines.map((t) => ({
            ...t,
            cues: t.cues.map((c) =>
              ids.includes(c.id)
                ? { ...c, start: Math.max(0, c.start + dStart), layerId: layerId ?? c.layerId }
                : c,
            ),
          })),
        }),
        false,
      ),
    ),

  resizeCue: (id, start, duration) =>
    set((s) =>
      patchShow(
        s,
        (show) => ({
          ...show,
          timelines: show.timelines.map((t) => ({
            ...t,
            cues: t.cues.map((c) =>
              c.id === id ? { ...c, start: Math.max(0, start), duration: Math.max(40, duration) } : c,
            ),
          })),
        }),
        false,
      ),
    ),

  toggleTween: (type) =>
    set((s) =>
      patchShow(s, (show) => {
        const ids = new Set(s.selection.kind === "cue" ? s.selection.ids : []);
        return {
          ...show,
          timelines: show.timelines.map((t) => ({
            ...t,
            cues: t.cues.map((c) => {
              if (!ids.has(c.id)) return c;
              const exists = c.tweens.some((tw) => tw.type === type);
              if (exists) return { ...c, tweens: c.tweens.filter((tw) => tw.type !== type) };
              const startVal =
                type === "opacity" ? c.opacity :
                type === "volume" ? c.volume :
                type === "scaleX" ? c.scale.x :
                type === "scaleY" ? c.scale.y :
                type === "positionX" ? c.position.x :
                type === "positionY" ? c.position.y :
                type === "rotationZ" ? c.rotation.z :
                0;
              return { ...c, tweens: [...c.tweens, makeTween(type, [{ time: 0, value: startVal }, { time: c.duration, value: startVal }])] };
            }),
          })),
        };
      }),
    ),

  updateTweenPoint: (cueId, tweenId, pointId, partial) =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        timelines: show.timelines.map((t) => ({
          ...t,
          cues: t.cues.map((c) =>
            c.id !== cueId
              ? c
              : {
                  ...c,
                  tweens: c.tweens.map((tw) =>
                    tw.id !== tweenId
                      ? tw
                      : {
                          ...tw,
                          points: tw.points.map((p) => (p.id === pointId ? { ...p, ...partial } : p)),
                        },
                  ),
                },
          ),
        })),
      })),
    ),

  addDisplay: (partial) =>
    set((s) =>
      patchShow(s, (show) => {
        const n = show.displays.length + 1;
        const last = show.displays[show.displays.length - 1];
        const d = emptyDisplay({
          name: `Display ${n}`,
          x: last ? last.x + last.width : 0,
          y: last ? last.y : 0,
          width: last?.width ?? 1920,
          height: last?.height ?? 1080,
          channel: n,
          ...partial,
        });
        return { ...show, displays: [...show.displays, d] };
      }),
    ),

  addDisplayGrid: (cols, rows, w, h, gap) =>
    set((s) =>
      patchShow(s, (show) => {
        const added: Display[] = [];
        let channel = show.displays.length + 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            added.push(
              emptyDisplay({
                name: `Tile ${r + 1}×${c + 1}`,
                x: c * (w + gap),
                y: r * (h + gap),
                width: w,
                height: h,
                channel: channel++,
              }),
            );
          }
        }
        return { ...show, displays: [...show.displays, ...added] };
      }),
    ),

  updateDisplay: (id, partial) =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        displays: show.displays.map((d) => (d.id === id ? { ...d, ...partial } : d)),
      })),
    ),

  importAssets: async (files) => {
    const loaded: Asset[] = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const kind: Asset["kind"] = file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
          ? "audio"
          : "image";
      let width = 1920;
      let height = 1080;
      let duration = 10000;
      if (kind === "image") {
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 1920, h: 1080 });
          img.src = url;
        });
        width = dims.w;
        height = dims.h;
        duration = get().show?.prefs.imageDuration ?? 5000;
      }
      if (kind === "video" || kind === "audio") {
        duration = await new Promise<number>((resolve) => {
          const el = document.createElement(kind);
          el.preload = "metadata";
          el.onloadedmetadata = () => resolve((el.duration || 10) * 1000);
          el.onerror = () => resolve(10000);
          el.src = url;
        });
      }
      loaded.push({
        id: uid("asset"),
        name: file.name.replace(/\.[^.]+$/, ""),
        kind,
        folderId: null,
        width,
        height,
        duration,
        fps: 60,
        url,
        codec: file.type || "BIN",
        color: kind === "video" ? "#38bdf8" : kind === "audio" ? "#a78bfa" : "#f59e0b",
        optimized: true,
        notes: `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`,
      });
    }
    set((s) =>
      patchShow(s, (show) => ({ ...show, assets: [...show.assets, ...loaded] })),
    );
    get().log(`Imported ${loaded.length} asset${loaded.length === 1 ? "" : "s"} into Asset Manager`);
  },

  updateAsset: (id, partial) =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        assets: show.assets.map((a) => (a.id === id ? { ...a, ...partial } : a)),
      })),
    ),

  deleteAsset: (id) =>
    set((s) =>
      patchShow(s, (show) => ({ ...show, assets: show.assets.filter((a) => a.id !== id) })),
    ),

  addTimeline: () =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        timelines: [...show.timelines, emptyTimeline(`Timeline ${show.timelines.length + 1}`)],
      })),
    ),

  updateTimeline: (id, partial) =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        timelines: show.timelines.map((t) => (t.id === id ? { ...t, ...partial } : t)),
      })),
    ),

  updateShowPrefs: (partial) =>
    set((s) => patchShow(s, (show) => ({ ...show, prefs: { ...show.prefs, ...partial } }))),

  updateVariable: (id, partial) =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        variables: show.variables.map((v) => (v.id === id ? { ...v, ...partial } : v)),
      })),
    ),

  addVariable: () =>
    set((s) =>
      patchShow(s, (show) => ({
        ...show,
        variables: [
          ...show.variables,
          { id: uid("var"), name: `var_${show.variables.length + 1}`, value: 0, min: 0, max: 1, protocol: "none", address: "" },
        ],
      })),
    ),

  setHoverCue: (id) => set({ hoverCueId: id }),
  setSnap: (v) => set({ snap: v }),
  setClickJumps: (v) => set({ clickJumpsToTime: v }),
  setLegacy: (v) => set({ legacyKeyboard: v }),
  setDraggingAsset: (id) => set({ draggingAssetId: id }),
  setFpsNow: (n) => set({ fpsNow: n }),
  toggleMessages: () => set((s) => ({ messagesOpen: !s.messagesOpen, menu: null })),

  ensureNdiAsset: () => {
    const { show, selection } = get();
    if (!show) return null;
    if (selection.kind === "asset") {
      const selected = show.assets.find((a) => a.id === selection.ids[0]);
      if (selected && (selected.kind === "ndi" || selected.kind === "capture")) return selected.id;
    }
    const existing = show.assets.find((a) => a.kind === "ndi");
    if (existing) return existing.id;
    const asset = emptyAsset({
      name: "NDI Program",
      kind: "ndi",
      codec: "NDI HX3",
      duration: 60000,
      color: "#4ade80",
      url: "procedural:ndi",
      notes: "Live NDI / capture input",
    });
    set((s) =>
      patchShow(s, (doc) => ({ ...doc, assets: [...doc.assets, asset] })),
    );
    get().select({ kind: "asset", ids: [asset.id] });
    return asset.id;
  },

  connectLiveSource: async (assetId, mode, url) => {
    try {
      if (mode === "camera") await connectCamera(assetId);
      else if (mode === "screen") await connectScreen(assetId);
      else {
        if (!url) throw new Error("Enter a stream URL");
        await connectUrl(assetId, url);
      }
      get().updateAsset(assetId, {
        notes: mode === "url" ? `Live URL · ${url}` : `Live ${mode} bound to this NDI input`,
        codec: mode === "camera" ? "NDI · Camera" : mode === "screen" ? "NDI · Screen" : "NDI HX / URL",
        optimized: true,
      });
      set((s) => ({ liveTick: s.liveTick + 1 }));
      get().log(`NDI source connected (${mode})`);
      const show = get().show;
      const used = show?.timelines.some((t) => t.cues.some((c) => c.assetId === assetId));
      if (!used) get().addCueFromAsset(assetId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "NDI connect failed";
      get().log(message, "error");
    }
  },
}));

export function useActiveTimeline() {
  return useApp((s) => activeTimeline(s.show, s.activeTimelineId));
}

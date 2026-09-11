export interface OutputScreen {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
}

const outputs = new Map<string, { win: Window; canvas: HTMLCanvasElement }>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeOutputs(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isOutputLive(displayId: string) {
  const out = outputs.get(displayId);
  if (out && out.win.closed) {
    outputs.delete(displayId);
    emit();
    return false;
  }
  return outputs.has(displayId);
}

export function closeDisplayOutput(displayId: string) {
  const out = outputs.get(displayId);
  if (out && !out.win.closed) out.win.close();
  outputs.delete(displayId);
  emit();
}

export async function listScreens(): Promise<OutputScreen[]> {
  const fallback: OutputScreen = {
    id: "current",
    label: "This PC screen",
    left: window.screenX,
    top: window.screenY,
    width: window.screen.width,
    height: window.screen.height,
    isPrimary: true,
  };
  const getDetails = window.getScreenDetails;
  if (typeof getDetails !== "function") return [fallback];
  try {
    const details = await getDetails.call(window);
    return details.screens.map((s, i) => ({
      id: `${s.left}x${s.top}-${s.width}x${s.height}-${i}`,
      label: s.label || (s.isPrimary ? "Primary" : `Monitor ${i + 1}`),
      left: s.availLeft ?? s.left,
      top: s.availTop ?? s.top,
      width: s.width,
      height: s.height,
      isPrimary: !!s.isPrimary,
    }));
  } catch {
    return [fallback];
  }
}

export function preferredOutputScreen(screens: OutputScreen[], channel = 1) {
  const extras = screens.filter((s) => !s.isPrimary);
  if (extras.length) return extras[Math.max(0, Math.min(extras.length - 1, channel - 1))] ?? extras[0];
  return screens[Math.max(0, Math.min(screens.length - 1, channel - 1))] ?? screens[0];
}

export async function openDisplayOutput(displayId: string, screen?: OutputScreen) {
  const existing = outputs.get(displayId);
  if (existing && !existing.win.closed) {
    existing.win.focus();
    return existing.win;
  }
  const width = screen?.width ?? 1920;
  const height = screen?.height ?? 1080;
  const left = screen?.left ?? window.screenX + 80;
  const top = screen?.top ?? window.screenY + 80;
  const win = window.open(
    "",
    `watchout-output-${displayId}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
  );
  if (!win) throw new Error("Popup blocked — allow popups, then click Output again.");
  win.document.title = "WATCHOUT · Display output";
  win.document.body.style.cssText = "margin:0;background:#000;overflow:hidden;color:#fafafa;font:12px ui-sans-serif,system-ui;width:100vw;height:100vh";
  win.document.body.innerHTML = `
    <canvas id="out" style="position:fixed;inset:0;width:100vw;height:100vh;background:#000"></canvas>
    <div id="hint" style="position:fixed;left:16px;bottom:16px;max-width:460px;padding:10px 12px;background:rgba(0,0,0,.72);border:1px solid #444;line-height:1.45">
      Drag this window onto the HDMI monitor, then click Fullscreen (or press F). A browser cannot bind a GPU HDMI port the way a WATCHOUT Display computer does — Windows must already see that monitor (Win+P → Extend).
      <div style="margin-top:8px"><button id="fs" style="background:#f5a623;color:#000;border:0;padding:6px 10px;cursor:pointer">Fullscreen</button></div>
    </div>`;
  const canvas = win.document.getElementById("out") as HTMLCanvasElement | null;
  if (!canvas) {
    win.close();
    throw new Error("Output window failed to start");
  }
  const goFs = () => {
    void win.document.documentElement.requestFullscreen?.().catch(() => undefined);
    const hint = win.document.getElementById("hint");
    if (hint) hint.style.display = "none";
  };
  win.document.getElementById("fs")?.addEventListener("click", goFs);
  canvas.addEventListener("click", goFs);
  win.addEventListener("keydown", (ev) => {
    if (ev.key === "f" || ev.key === "F" || ev.key === "F11") {
      ev.preventDefault();
      goFs();
    }
    if (ev.key === "Escape") closeDisplayOutput(displayId);
  });
  win.addEventListener("beforeunload", () => {
    outputs.delete(displayId);
    emit();
  });
  try {
    win.moveTo(left, top);
    win.resizeTo(width, height);
  } catch {
    /* window-management permission may still be pending */
  }
  outputs.set(displayId, { win, canvas });
  emit();
  void win.document.documentElement.requestFullscreen?.().catch(() => undefined);
  return win;
}

export function forEachOutput(fn: (displayId: string, canvas: HTMLCanvasElement, win: Window) => void) {
  for (const [id, out] of outputs) {
    if (out.win.closed) {
      outputs.delete(id);
      emit();
      continue;
    }
    fn(id, out.canvas, out.win);
  }
}

"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/store/appStore";

export function PlaybackClock() {
  const tickPlayback = useApp((s) => s.tickPlayback);
  const setFpsNow = useApp((s) => s.setFpsNow);
  const playing = useApp((s) => s.show?.timelines.some((t) => t.playback === "play") ?? false);
  const last = useRef(0);
  const frames = useRef(0);
  const stamp = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    last.current = performance.now();
    const loop = (now: number) => {
      const dt = now - last.current;
      last.current = now;
      tickPlayback(dt);
      frames.current += 1;
      if (stamp.current === 0) stamp.current = now;
      if (now - stamp.current > 500) {
        setFpsNow((frames.current * 1000) / (now - stamp.current));
        frames.current = 0;
        stamp.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, tickPlayback, setFpsNow]);

  return null;
}

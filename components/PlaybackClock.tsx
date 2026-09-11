"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/store/appStore";

export function PlaybackClock() {
  const setFpsNow = useApp((s) => s.setFpsNow);
  const frames = useRef(0);
  const stamp = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    last.current = 0;
    const loop = (now: number) => {
      if (last.current === 0) last.current = now;
      const dt = Math.min(100, now - last.current);
      last.current = now;
      const playing = useApp.getState().show?.timelines.some((t) => t.playback === "play");
      if (playing) useApp.getState().tickPlayback(dt);
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
  }, [setFpsNow]);

  return null;
}

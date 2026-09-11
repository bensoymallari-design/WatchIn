"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

export function CamClient() {
  const params = useParams<{ room: string }>();
  const room = params.room;
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Tap Start to share this phone camera with Producer.");
  const [live, setLive] = useState(false);
  const [secure] = useState(() => (typeof window === "undefined" ? true : window.isSecureContext));
  const [facing, setFacing] = useState<"user" | "environment">("environment");

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      void fetch(`/api/ndi/room/${room}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "phone", type: "hangup" }),
      });
    };
  }, [room]);

  async function start() {
    if (!secure) {
      setStatus("This browser blocks the camera on http://. On the computer run npm run dev:https, then open the https:// link on this phone.");
      return;
    }
    setStatus("Starting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const pc = new RTCPeerConnection({ iceServers: ICE });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        void fetch(`/api/ndi/room/${room}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: "phone", type: "ice", payload: ev.candidate.toJSON() }),
        });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await fetch(`/api/ndi/room/${room}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "phone", type: "offer", payload: pc.localDescription }),
      });
      setStatus("Waiting for Producer… keep this page open.");
      const seen = new Set<string>();
      const poll = async () => {
        const res = await fetch(`/api/ndi/room/${room}`, { cache: "no-store" });
        const roomState = await res.json();
        if (roomState.answer && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(roomState.answer);
          setLive(true);
          setStatus("Live — Producer is using this camera as an NDI input.");
        }
        for (const c of roomState.producerIce ?? []) {
          const key = `${c.candidate}:${c.sdpMLineIndex}`;
          if (seen.has(key)) continue;
          seen.add(key);
          try {
            await pc.addIceCandidate(c);
          } catch {
            /* remote description may still be pending */
          }
        }
        if (pc.connectionState !== "closed") timer = window.setTimeout(() => void poll(), 400);
      };
      let timer = window.setTimeout(() => void poll(), 400);
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setLive(true);
          setStatus("Live — Producer is using this camera as an NDI input.");
        }
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStatus("Connection dropped. Tap Start again.");
          setLive(false);
        }
      };
      void timer;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Camera failed";
      setStatus(message);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-stone-100">
      <div className="px-4 py-3 text-[11px] tracking-[0.28em] text-[#f5a623]">WATCHOUT · PHONE CAMERA</div>
      <video ref={videoRef} className="min-h-[42vh] w-full bg-[#111] object-cover" playsInline muted autoPlay />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className={`text-sm ${live ? "text-emerald-400" : "text-stone-300"}`}>{status}</div>
        {!secure && (
          <p className="rounded border border-amber-700/70 bg-amber-950/50 p-3 text-[13px] text-amber-100">
            Camera access needs HTTPS. The NDI HX Camera app on this phone still will not appear in Producer — browsers cannot decode native NDI. Use this page over https:// to send the camera instead.
          </p>
        )}
        <div className="flex gap-2">
          <button className="flex-1 rounded bg-[#f5a623] py-3 text-base font-semibold text-black" onClick={() => void start()}>
            Start
          </button>
          <button
            className="rounded border border-[#444] px-3 py-3 text-sm"
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          >
            {facing === "environment" ? "Rear" : "Front"}
          </button>
        </div>
        <p className="text-[12px] leading-relaxed text-stone-500">
          This is a WebRTC camera feed into Producer, not NewTek NDI discovery. Keep the screen on. Room {room}.
        </p>
      </div>
    </div>
  );
}

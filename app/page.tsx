"use client";

import { useEffect } from "react";
import { Producer } from "@/components/Producer";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useApp } from "@/store/appStore";

export default function Home() {
  const view = useApp((s) => s.view);
  const boot = useApp((s) => s.boot);
  useEffect(() => {
    boot();
  }, [boot]);
  return view === "welcome" ? <WelcomeScreen /> : <Producer />;
}

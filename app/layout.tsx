import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WATCHOUT 7 — Producer",
  description: "WATCHIN: a browser-based WATCHOUT 7 Producer — multi-display show composer with Stage, Timeline, Assets, Director and Runner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

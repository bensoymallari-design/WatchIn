import type { NextConfig } from "next";
import os from "os";

function lanHosts() {
  const hosts: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) hosts.push(addr.address);
    }
  }
  return hosts;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: lanHosts(),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(), display-capture=(self), window-management=(self), fullscreen=(self)" }],
      },
    ];
  },
};

export default nextConfig;

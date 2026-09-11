import os from "os";
import createMdns from "multicast-dns";

export function lanIPv4() {
  const out: { address: string; name: string }[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) out.push({ address: addr.address, name });
    }
  }
  return out;
}

interface DnsRecord {
  name?: string;
  type?: string;
  data?: unknown;
  ttl?: number;
}

interface DnsPacket {
  answers?: DnsRecord[];
  additionals?: DnsRecord[];
}

export interface NdiAdvert {
  name: string;
  host: string;
  port: number;
  ip?: string;
}

function records(pkt: DnsPacket) {
  return [...(pkt.answers ?? []), ...(pkt.additionals ?? [])];
}

export async function discoverNdiSources(timeoutMs = 2800): Promise<NdiAdvert[]> {
  const mdns = createMdns();
  const byName = new Map<string, NdiAdvert>();

  const ingest = (pkt: DnsPacket) => {
    for (const rec of records(pkt)) {
      const name = (rec.name || "").replace(/\._ndi\._tcp\.local$/i, "").replace(/\.local$/i, "");
      if (rec.type === "PTR" && typeof rec.data === "string" && rec.data.toLowerCase().includes("_ndi._tcp")) {
        const instance = rec.data.replace(/\._ndi\._tcp\.local$/i, "");
        if (!byName.has(instance)) byName.set(instance, { name: instance, host: "", port: 0 });
      }
      if (rec.type === "PTR" && rec.name?.toLowerCase() === "_ndi._tcp.local" && typeof rec.data === "string") {
        const instance = rec.data.replace(/\._ndi\._tcp\.local$/i, "");
        if (!byName.has(instance)) byName.set(instance, { name: instance, host: "", port: 0 });
      }
      if (rec.type === "SRV" && rec.data && typeof rec.data === "object") {
        const srv = rec.data as { port?: number; target?: string };
        const instance = (rec.name || "").replace(/\._ndi\._tcp\.local$/i, "");
        const cur = byName.get(instance) ?? { name: instance || name, host: "", port: 0 };
        cur.port = srv.port ?? cur.port;
        cur.host = (srv.target || "").replace(/\.local$/i, "") || cur.host;
        byName.set(cur.name, cur);
      }
      if (rec.type === "A" && typeof rec.data === "string") {
        const host = (rec.name || "").replace(/\.local$/i, "");
        for (const src of byName.values()) {
          if (!src.host || src.host === host || src.name === host) src.ip = rec.data;
        }
      }
      if (rec.type === "TXT") {
        const instance = (rec.name || "").replace(/\._ndi\._tcp\.local$/i, "");
        if (instance && !byName.has(instance)) byName.set(instance, { name: instance, host: "", port: 0 });
      }
      void name;
    }
  };

  mdns.on("response", ingest);
  mdns.query({ questions: [{ name: "_ndi._tcp.local", type: "PTR" }] });
  mdns.query("_ndi._tcp.local", "PTR");

  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  mdns.destroy();
  return [...byName.values()].filter((s) => s.name);
}

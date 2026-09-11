declare module "multicast-dns" {
  interface Packet {
    answers?: { name?: string; type?: string; data?: unknown }[];
    additionals?: { name?: string; type?: string; data?: unknown }[];
  }
  interface Mdns {
    query: (q: unknown, type?: string) => void;
    on: (event: "response", cb: (pkt: Packet) => void) => void;
    destroy: () => void;
  }
  export default function multicastDns(opts?: object): Mdns;
}

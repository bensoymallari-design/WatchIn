# WATCHIN — WATCHOUT 7 Producer

Browser-based recreation of Dataton **WATCHOUT 7** Producer: a multi-display show composer with Stage, Timeline, Assets, Devices, Nodes, Variables and live preview.

WATCHOUT itself is a native Windows media-server suite (Producer, Director, Runner, Asset Manager). This project rebuilds that workflow in Next.js so you can author and play a show in the browser.

## What you can do

- New / Open / Save shows (`.watch.json`) plus a 3-wide LED demo
- Stage canvas with displays, pan/zoom, soft-edge blend, display grids
- Timeline with layers, media/control/marker/output/ArtNet cues, play/pause/stop, loop
- Drag assets onto the Timeline or Stage
- Tweens (opacity, position, scale, rotation, color, crop, wipe) from the Effect menu
- Import images, video and audio into the Asset Manager
- Local Director / Runner / Asset Manager node status
- Floating, resizable windows and layout presets (Alt+0/1/2)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run typecheck
npm run build
```

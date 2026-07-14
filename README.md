![Bitcoin Globe](screenshot.jpg)

# Bitcoin Globe

A real-time 3D visualization of the Bitcoin network. The globe renders geolocated Bitcoin nodes as glowing points, with live mempool pressure shown as an atmospheric layer and new blocks triggering a ripple wave across the surface.

## What it shows

- **Node globe** — each known Bitcoin node plotted at its real-world coordinates using instanced rendering
- **Mempool pressure** — a continuous atmosphere layer whose intensity reflects current mempool congestion (pending vBytes, intake rate)
- **Block heartbeat** — a sphere-wave pulse whenever a new block is mined
- **Live telemetry** — node count, chain height, mempool depth, and network pressure in the HUD

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + TypeScript |
| 3D rendering | Three.js via `@react-three/fiber` |
| Post-processing | `@react-three/postprocessing` (bloom) |
| 3D helpers | `@react-three/drei` |
| Build tool | Vite |
| Styles | Sass |
| Backend runtime | Node.js + TypeScript (`tsx`) |
| Backend transport | WebSockets (`ws`) |
| Data sources | [Bitnodes](https://bitnodes.io) snapshot API, [mempool.space](https://mempool.space) WebSocket |
| Geo data | `world-atlas` + `topojson-client` |
| Monorepo | npm workspaces |

## Project structure

```
bitcoin-globe/
├── shared/          # Types and normalization shared by frontend and backend
├── backend/         # Node.js WebSocket server — polls Bitnodes, streams mempool.space
└── frontend/        # React + Three.js app — renders the globe and HUD
```

## Prerequisites

- Node.js 20+
- npm 10+

## Install

```bash
npm install
```

This installs dependencies for the root workspace and all packages (`shared`, `backend`, `frontend`).

## Run

Open two terminals from the project root:

```bash
# Terminal 1 — backend (WebSocket server on port 8787)
npm run dev:backend

# Terminal 2 — frontend (Vite dev server)
npm run dev:frontend
```

Then open [http://localhost:5173](http://localhost:5173) in a browser.

The backend connects to `mempool.space` via WebSocket for live mempool and block data. Node location data is loaded from a local fixture snapshot (`backend/fixtures/nodes-snapshot.json`).

## Build

```bash
npm run build -w frontend
```

Static output is written to `frontend/dist/`.

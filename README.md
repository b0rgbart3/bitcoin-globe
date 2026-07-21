![Synchronicity: A Bitcoin Visualization](screenshot.jpg)

# Synchronicity: A Bitcoin Visualization

A real-time 3D visualization of the Bitcoin network — the physical machines that carry it, the transactions flowing between them, and the variable duration rateheartbeat of consensus (blocks being mined).

The driving principle is **honest encoding.** Where something can be measured — a node's location, a transaction's size, a feerate — that measurement drives the visual directly. Aesthetic choices fill the rest, shaped to make the network legible and the experience worth staying with. The balance tips toward the data wherever it can.

---

## What it shows

| Layer                  | What it is                                    | Encoding                                                                                                                                |
| ---------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Node globe**         | Reachable Bitcoin nodes with a locatable IP   | Pale green points at real lat/lng                                                                                                       |
| **Unlocatable halo**   | Reachable nodes with **no** coordinates (Tor) | Pale green points in a tumbling off-globe band                                                                                          |
| **Transaction stream** | Each transaction as it enters the mempool     | Size ← vsize · Colour ← feerate · Orbital radius ← feerate rank                                                                         |
| **Atmosphere**         | Aggregate mempool pressure                    | Fresnel shell brightness ← pending vBytes + intake rate                                                                                 |
| **Block heartbeat**    | A block being mined                           | A cool teal flare across all nodes + expanding shockwave                                                                                |
| **Sunlight**           | Real time of day                              | Directional light at the true subsolar point                                                                                            |
| **Moon**               | The real Moon at its current position         | Phase ← sunlight geometry · Size ← exact proportion · Position ← sublunar point                                                         |
| **ISS**                | The International Space Station               | Inclination 51.6° · Altitude 408 km · Period 92.68 min (all real) · Phase arbitrary (no live TLE) · Geometry exaggerated for visibility |
| **Telemetry**          | Live figures                                  | Located · unlocatable · height · pending vMB · tx/s · sat/vB · since block                                                              |

---

## The honest encoding

These aren't stylistic choices. Each one is a decision about what the data can and cannot truthfully say.

### Geography exists for machines, not for money

Bitcoin transactions have **no location**. A transaction is inputs, outputs, and scripts — there is no country, no city, no IP anywhere in the blockchain. Visualizations that show transactions "lighting up around the globe" are showing decorative fiction.

Nodes are different: they're physical machines with IP addresses that can be geolocated. So the globe is the network's **body**, and everything without a location lives _off_ the globe by construction:

- **Nodes** → placed on the sphere at real coordinates.
- **Unlocatable nodes** → a band around the globe, uniformly random, tumbling on drifting axes. Any position on it is meaningless _by design_ — the motion exists so no fixed frame can be read into it.
- **Transactions** → motes drifting in the abstract volume between globe and halo. Their angular position and orbital direction carry no information; only their distance from the globe does (see below).

### Size is vsize. Colour is feerate. Value is never encoded.

A transaction moving 500 BTC and one moving 5,000 sats look **identical** if their vsize and feerate match. That's deliberate. A miner assembling a block runs a knapsack over feerate against the 4,000,000 weight-unit ceiling — the amount of money moved is not an input to that decision anywhere. So the two things that decide inclusion are the two things drawn:

- **size ← vsize** — how much block space it consumes (driven by input/output count, not amount)
- **colour ← feerate** — what it pays per unit of that space

The amount transferred appears nowhere in the visuals. A big high-fee mote is a _large transaction paying a high rate_ — usually a consolidation or an inscription — not a whale moving a fortune.

### Orbital radius is queue position — and it tracks the live market

The mempool isn't a queue you advance through by waiting; it's a **continuous auction**. Your feerate is fixed the moment you broadcast, but your _rank_ isn't — higher-fee transactions keep arriving and jump ahead of you. So a transaction's feerate _is_ its distance from being mined, and that maps to orbital radius:

- **High feerate → inner orbit**, tight against the atmosphere — next in line.
- **Low feerate → outer orbit**, drifting far out — waiting, possibly for a long time.

Crucially, the radius is normalized against the **live fee ladder** (`fees.minimum` → `fees.fastest`, which arrive continuously on the stats feed), not a fixed scale. Your feerate never changes, but your radius does — because your position in the auction moves as the market moves. A mote doesn't inch inward by being patient; it only moves in if the market comes _down to meet it_. During congestion the whole cloud holds its stratified shells; during a genuine lull the ladder compresses and previously-stranded transactions visibly draw inward as they become minable. On a calm night where nearly every transaction pays the floor rate, there is almost no spread — so the cloud collapses to a single shell, which is the honest picture of a network where nobody needs to compete.

Speed is derived from radius (inner orbits are quicker), but it carries no _independent_ information — it's the same feerate fact that colour and radius already show, used only to make the shells feel alive. Each mote holds its own randomly-oriented orbit for life, so the swarm has no net direction: order without orientation.

### Nothing predicts a block, because nothing can

Mining is memoryless. Every hash is an independent lottery ticket, so if nine minutes have passed since the last block, the expected wait for the next one is still ten minutes. There is no signal — not in fees, not in mempool depth, not in hashrate — that indicates a block is _about to_ happen.

So there is **no countdown and no crescendo**. The atmosphere tracks congestion, which is uncorrelated with block timing. The telemetry shows _time since_ the last block, never time until. The pulse arrives unannounced. That unpredictability isn't a gap in the visualization — it _is_ the phenomenon.

### Weight, not megabytes

Block fullness is `weight / 4,000,000`, not size in MB. SegWit discounts witness data, so a block is full at 4M weight units regardless of whether that lands at 1.6 MB or 2.1 MB.

### Motes die when a block confirms them, not on a timer

A transaction's real lifetime runs from arrival to confirmation — an _event_, not a duration. Each block reports `feeRange[0]`, the lowest feerate it included; miners fill greedily by feerate, so every pending mote at or above that threshold flares and vanishes at the pulse. Because feerate is also radius, the block eats the cloud from the **inside out**: the inner high-fee shell flashes away while the cool low-fee stragglers keep drifting, still waiting — because in reality, they are.

### The ISS orbit is real; the position on it is not

The ISS orbit has an inclination of 51.6°, an altitude of 408 km, and a period of 92.68 minutes — all real figures. The inclined orbit ring traces the correct band of latitudes the station actually sweeps (±51.6°), at true scale, moving at the real angular rate.

One thing is deliberately wrong:

- **Position on orbit** — without a live TLE feed there is no way to know the ISS's current angular position. The station starts at an arbitrary point each time the scene loads. The _shape and altitude_ of the orbit are correct; only the station's location within it is invented.

The ISS structure itself is exaggerated several hundred× in size — at true scale (109 m wide) it would be sub-pixel.

### The Moon phase is not drawn — it falls out

The Moon is placed at the real sublunar point — the geographic coordinates directly beneath it — using `astronomy-engine` (NASA, DE405-accuracy) to compute the geocentric equatorial vector and Greenwich Sidereal Time to convert it to longitude. Position is recomputed every 30 seconds; the Moon moves ~0.018° in that window, well below any perceptible threshold.

Phase is never computed or painted. The scene already has a directional light at the true subsolar point. When that light hits a sphere placed at the correct lunar position, the illuminated arc facing Earth is the crescent, gibbous, or full disk that matches tonight's sky. The shader doesn't know it's drawing a phase — it's just lighting a sphere.

Two things are accurate and one is deliberately wrong:

- **Direction** — astronomically correct to the arcminute.
- **Size** — the Moon's radius is 0.2727× Earth's, and the scene uses that exact ratio.
- **Distance** — the true distance is ~60 Earth-radii, which puts the Moon far off-screen at this scene scale. The scene distance is compressed to keep both objects in the same view. The direction (and therefore the phase) is unaffected; only the distance is a lie.

### The visualization discloses its own blind spots

- The transaction feed is a **rolling window**, not a firehose. During bursts, arrivals are missed — the `tx/s` stat labels itself `·sampled` when it detects saturation.
- `feeRange[0]` is a good approximation, but CPFP and package relay mean a low-fee transaction can ride in on a high-fee child.
- The mote swarm holds a few thousand transactions against a real backlog of ~250,000. It's a window on **arrivals**, never the whole mempool.
- **Node opacity breathes** on a slow ambient cycle — an aesthetic rhythm, not a signal from any data source.
- **The atmosphere briefly dims after a block is confirmed** — a visual punctuation mark, not a measurement of mempool state. Real mempool pressure resumes driving the brightness immediately after.

---

## What it teaches

Watch it long enough and it argues with several things people believe about Bitcoin.

**Most of the network is invisible.** Around **63% of reachable nodes are unlocatable** — Tor, no coordinates. The halo isn't a footnote; it outnumbers everything on the globe. And that's only the _reachable_ network: the majority of all nodes sit behind NAT, accept no incoming connections, and cannot be enumerated by anyone. The globe shows the observable minority of an observably larger whole.

**The visible part is a map of data centres, not of people.** The dense clusters are Ashburn, Falkenstein, Amsterdam, Helsinki — where cheap hosting lives, not where Bitcoin enthusiasts do. Someone in Caracas running a node on a New Jersey droplet appears as a New Jersey node. The map systematically relocates operators to their servers.

**Nodes are not miners.** Mining hashpower and node geography barely overlap. Countries famous for mining can show almost no nodes, because a miner points hashrate at a _pool_, and the pool's node lives in a data centre somewhere else entirely.

**There is no rhythm to find.** The most valuable thing the piece can teach is that the pattern you're looking for doesn't exist. Quiet minutes yield nothing; busy minutes yield instant blocks; and vice versa. You learn memorylessness by watching it refuse to resolve.

**And the honesty is what reveals it.** None of these insights were designed in. They fell out of a rule — _show only what the data actually says_ — and the network turned out to be more interesting than the marketing version.

---

## About the Creator

Synchronicity: A Bitcoin Visualization was designed and built by **Bart Dority**— developer, designer, and independent researcher at the intersection of design, engineering, and data visualization systems.

## Tech stack

| Layer              | Technology                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Frontend framework | React 19 + TypeScript                                                                                   |
| 3D rendering       | Three.js via `@react-three/fiber`                                                                       |
| Post-processing    | `@react-three/postprocessing` (bloom)                                                                   |
| 3D helpers         | `@react-three/drei`                                                                                     |
| Build tool         | Vite                                                                                                    |
| Styles             | Sass                                                                                                    |
| Backend runtime    | Node.js + TypeScript (`tsx`)                                                                            |
| Backend transport  | WebSockets (`ws`)                                                                                       |
| Data sources       | [mempool.space](https://mempool.space) WebSocket · [Bitnodes](https://bitnodes.io)-format node snapshot |
| Geo data           | `world-atlas` + `topojson-client`                                                                       |
| Solar position     | NOAA subsolar-point approximation (no API)                                                              |
| Lunar position     | `astronomy-engine` (NASA, MIT) — DE405-accuracy geocentric equatorial coords + GMST                     |
| Monorepo           | npm workspaces                                                                                          |

### Architecture

Two tempos share one render loop:

- **Continuous** — mempool state arrives every 1–2s and is _damped_ toward each frame, so stepwise data breathes instead of snapping.
- **Discrete** — block events spawn animations with their own lifecycle: born, animated, retired.

Per-frame state lives in refs, never React state — the render loop never triggers a re-render. External API shapes are normalized to domain types at a single boundary (`shared/normalize.ts`), so a data source can change without anything downstream noticing.

---

## Data sources & current status

**Live:** mempool.space's WebSocket supplies mempool stats, the transaction stream, and block events.

**Node data:** the long-running bitnodes.io crawler's domain expired in May 2026 and the API is currently unreachable. The app is source-agnostic — `backend/src/sources/bitnodes.ts` accepts either a live Bitnodes-format HTTP endpoint or a local fixture, and only that one file changes when a live source is restored.

Development currently runs against a **clearly-labelled synthetic fixture** (`scripts/make-fixture.ts`). Its _counts and country proportions are real_ — taken from the last published Bitnodes snapshot (24,557 reachable, 62.99% `.onion`, US 2695 / DE 1241 / FR 678 …) — but the individual nodes are invented and use reserved non-routable IP ranges. The snapshot file states this in its own `_comment` field, and the backend logs the provenance of every load (`live` / `cache` / `fixture`) so it's never ambiguous what you're looking at.

When a live source is wired, note that Bitnodes rate-limits unauthenticated requests to ~10/day; the source module caches snapshots to disk and persists a daily request count to stay under it.

---

## Project structure

```
bitcoin-globe/
├── shared/          # Types + normalization — imported by both sides, imports neither
├── backend/         # Node WebSocket gateway — node snapshots, mempool.space relay
│   ├── src/sources/ # The outside-world boundary: fetch, validate, normalize
│   ├── scripts/     # make-fixture.ts — synthetic snapshot generator
│   └── fixtures/
└── frontend/        # React + Three.js
    └── src/scene/   # Globe · Coastlines · Atmosphere · Heartbeat ·
                     # UnlocatableHalo · TransactionStream · SunLight · Starfield · Moon · ISS
```

## Prerequisites

- Node.js 20+
- npm 10+

## Install

```bash
npm install
```

Installs the root workspace and all packages (`shared`, `backend`, `frontend`).

## Run

Two terminals, from the project root:

```bash
# Terminal 1 — backend (WebSocket gateway on port 8787)
npm run dev:backend

# Terminal 2 — frontend (Vite dev server)
npm run dev:frontend
```

Then open [http://localhost:5173](http://localhost:5173).

Press **`b`** to fire a test block pulse without waiting ~10 minutes for a real one. (Dev only — the flare and shockwave fire, but no transactions are harvested, since there's no real block to harvest against.)

## Build

```bash
npm run build -w frontend
```

Static output is written to `frontend/dist/`.

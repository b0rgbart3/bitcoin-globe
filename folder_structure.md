bitcoin-globe/
├── shared/ # single source of truth — imported by BOTH sides,
│ │ # imports from neither (dependencies point inward)
│ ├── types.ts # the raw + domain contract [done]
│ ├── normalize.ts # raw -> domain pure functions [done]
│ └── index.ts # barrel: re-exports types + normalize
│
├── backend/ # Node + TypeScript
│ ├── src/
│ │ ├── sources/ # THE OUTSIDE-WORLD BOUNDARY: fetch + validate raw
│ │ │ ├── bitnodes.ts # poll snapshot (slow/cached) -> validate -> normalize
│ │ │ └── mempool.ts # mempool.space WS client -> parse frames -> normalize
│ │ ├── state/
│ │ │ └── store.ts # in-memory cache: latest NodeSnapshot, MempoolState,
│ │ │ # candidates, recent blocks (the "cache" box)
│ │ ├── gateway/
│ │ │ ├── ws.ts # your WS server: fans out ServerMessage (throttled)
│ │ │ └── rest.ts # REST: history + on-demand block txs
│ │ └── index.ts # compose: start pollers, hydrate store, start gateway
│ ├── package.json
│ └── tsconfig.json
│
├── frontend/ # React + Three.js + Sass
│ ├── src/
│ │ ├── net/
│ │ │ └── client.ts # connect backend WS; switch(msg.type) -> refs
│ │ ├── state/
│ │ │ └── refs.ts # target / ripples / view refs (never useState per frame)
│ │ ├── scene/ # the four render layers
│ │ │ ├── Globe.tsx # located nodes -> InstancedMesh
│ │ │ ├── Halo.tsx # unlocatable pool (off-globe, counted)
│ │ │ ├── Atmosphere.tsx # mempool pressure (continuous lane)
│ │ │ ├── Ripple.ts # one block wave: spawn/animate/retire (discrete)
│ │ │ └── Treemap.tsx # candidate / confirmed block payload
│ │ ├── loop/
│ │ │ └── useRenderLoop.ts# the useFrame: damp continuous + advance ripples
│ │ ├── ui/ # React chrome: counters, timeline scrub, live/history
│ │ ├── styles/\*.scss # Sass
│ │ ├── App.tsx
│ │ └── main.tsx
│ ├── package.json
│ └── tsconfig.json
│
├── package.json # workspace root
└── tsconfig.base.json # shared compiler config

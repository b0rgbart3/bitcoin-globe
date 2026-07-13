// backend/src/index.ts
import { fileURLToPath } from "node:url";
import { BitnodesSource } from "./sources/bitnodes";
import { Gateway } from "./gateway/ws";

let bitnodes: BitnodesSource;

const gateway = new Gateway({
    port: 8787,
    getInitial: () => bitnodes?.getLatest() ?? null,
});

bitnodes = new BitnodesSource({
    source: {
        kind: "fixture",
        path: fileURLToPath(new URL("../fixtures/nodes-snapshot.json", import.meta.url)),
    },
    onUpdate: (snap) => gateway.broadcast({ type: "nodes", data: snap }),
});

await bitnodes.start();
// backend/src/index.ts
import { fileURLToPath } from "node:url";
import { BitnodesSource } from "./sources/bitnodes";
import { MempoolSource } from "./sources/mempool";
import { Gateway } from "./gateway/ws";

let bitnodes: BitnodesSource;

const gateway = new Gateway({
    port: 8787,
    getInitial: () => bitnodes?.getLatest() ?? null,
});

// bitnodes = new BitnodesSource({
//     source: {
//         kind: "fixture",
//         path: fileURLToPath(new URL("../fixtures/nodes-snapshot.json", import.meta.url)),
//     },
//     onUpdate: (snap) => gateway.broadcast({ type: "nodes", data: snap }),
// });

// bitnodes = new BitnodesSource({
//     source: { kind: "http", url: "https://bitnodes.io/api/v1/snapshots/latest/" },
//     onUpdate: (snap) => gateway.broadcast({ type: "nodes", data: snap }),
// });

bitnodes = new BitnodesSource({
    // source: { kind: "http", url: "https://bitnodes.io/api/v1/snapshots/latest/" },
    source: {
        kind: "fixture",
        path: fileURLToPath(new URL("../fixtures/nodes-snapshot-large.json", import.meta.url)),
    },
    cacheDir: fileURLToPath(new URL("../.cache", import.meta.url)),
    fixturePath: fileURLToPath(new URL("../fixtures/nodes-snapshot.json", import.meta.url)),
    onUpdate: (snap) => gateway.broadcast({ type: "nodes", data: snap }),
});

const mempool = new MempoolSource({
    onUpdate: (state) => gateway.broadcast({ type: "mempool", data: state }),
    onBlock: (block) => gateway.broadcast({ type: "block", data: block }),
    onTransactions: (txs) => gateway.broadcast({ type: "tx-stream", data: txs }),
});

await bitnodes.start();
mempool.start();
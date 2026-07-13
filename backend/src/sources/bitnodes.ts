// ============================================================================
// backend/src/sources/bitnodes.ts
// The outside-world boundary for node data: acquire -> validate -> normalize.
//
// NOTE: the original bitnodes.io domain expired in May 2026, so there is no
// single guaranteed live endpoint right now. This module is source-agnostic:
// point it at a local fixture for development, or at any Bitnodes-format HTTP
// endpoint once you've picked a live successor. Only the `source` changes —
// validation, normalization, and everything downstream stay identical.
// ============================================================================

import { readFile } from "node:fs/promises";
import type { BitnodesSnapshotRaw, NodeSnapshot } from "@btcglobe/shared/types";
import { normalizeNodeSnapshot } from "@btcglobe/shared/normalize";

// Where a snapshot comes from. The raw *shape* is the contract; acquisition varies.
export type NodeSource =
    | { kind: "fixture"; path: string }                       // dev: local JSON file
    | { kind: "http"; url: string; apiToken?: string };       // live: Bitnodes-format API

const DEFAULT_POLL_MS = 3 * 60 * 60 * 1000; // 3h — node geography barely moves

export interface BitnodesOptions {
    source: NodeSource;
    pollMs?: number;
    onUpdate?: (snap: NodeSnapshot) => void;
    onError?: (err: unknown) => void;
}

// Cheap structural check before the (trusting) normalizer sees the data.
function assertSnapshotShape(x: unknown): asserts x is BitnodesSnapshotRaw {
    if (typeof x !== "object" || x === null) {
        throw new Error("node snapshot: response is not an object");
    }
    const o = x as Record<string, unknown>;
    if (typeof o.timestamp !== "number" || typeof o.latest_height !== "number") {
        throw new Error("node snapshot: missing timestamp / latest_height");
    }
    if (typeof o.nodes !== "object" || o.nodes === null) {
        throw new Error("node snapshot: missing nodes map");
    }
}

// Acquire the raw payload from whichever source is configured.
async function acquireRaw(source: NodeSource): Promise<unknown> {
    if (source.kind === "fixture") {
        return JSON.parse(await readFile(source.path, "utf8"));
    }
    const headers: Record<string, string> = { "User-Agent": "btcglobe/0.1" };
    if (source.apiToken) headers["Authorization"] = `Token ${source.apiToken}`;
    const res = await fetch(source.url, { headers });
    if (res.status === 429) {
        throw new Error("node snapshot: rate limited (429) — lengthen pollMs or add a token");
    }
    if (!res.ok) throw new Error(`node snapshot: HTTP ${res.status}`);
    return res.json();
}

// acquire -> validate -> normalize. Throws on any failure.
export async function loadNodeSnapshot(source: NodeSource): Promise<NodeSnapshot> {
    const raw = await acquireRaw(source);
    assertSnapshotShape(raw);
    return normalizeNodeSnapshot(raw);
}

// Loads once, caches, and (for live http sources) refreshes on an interval.
export class BitnodesSource {
    private latest: NodeSnapshot | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private readonly pollMs: number;

    constructor(private readonly opts: BitnodesOptions) {
        this.pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
    }

    getLatest(): NodeSnapshot | null {
        return this.latest;
    }

    async start(): Promise<void> {
        await this.refresh();
        // A fixture is static — no point re-reading it on a timer.
        if (this.opts.source.kind === "http") {
            this.timer = setInterval(() => void this.refresh(), this.pollMs);
        }
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    private async refresh(): Promise<void> {
        try {
            const snap = await loadNodeSnapshot(this.opts.source);
            this.latest = snap;
            this.opts.onUpdate?.(snap);
            console.log(
                `[nodes] ${snap.located.length} located + ${snap.unlocatableCount} unlocatable ` +
                `= ${snap.totalReachable} nodes @ height ${snap.chainHeight}` +
                (this.opts.source.kind === "fixture" ? "  (fixture)" : ""),
            );
        } catch (err) {
            this.opts.onError?.(err);
            console.error("[nodes] refresh failed:", err instanceof Error ? err.message : err);
        }
    }
}
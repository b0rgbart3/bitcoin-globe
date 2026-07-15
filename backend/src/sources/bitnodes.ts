// ============================================================================
// backend/src/sources/bitnodes.ts
// The outside-world boundary for node data: acquire -> validate -> normalize.
//
// Bitnodes allows only 10 unauthenticated requests per IP per DAY, and `tsx
// watch` refetches on every restart — so a naive poller burns the quota in
// minutes. This module therefore:
//   1. caches the RAW snapshot to disk (survives restarts)
//   2. tracks + persists the daily request count (resets at UTC midnight)
//   3. prefers the cache; only fetches when the cache is stale AND quota remains
//   4. falls back: fresh cache -> live fetch -> stale cache -> fixture
// The result: restarts are free, and we can never exceed the daily limit.
// ============================================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { BitnodesSnapshotRaw, NodeSnapshot } from "@btcglobe/shared/types";
import { normalizeNodeSnapshot } from "@btcglobe/shared/normalize";

export type NodeSource =
    | { kind: "fixture"; path: string }
    | { kind: "http"; url: string; apiToken?: string };

const DEFAULT_POLL_MS = 3 * 60 * 60 * 1000;   // 3h between live fetches
const DEFAULT_MAX_PER_DAY = 8;                // leave headroom under the limit of 10

// A real browser UA — Bitnodes sits behind Cloudflare, which can reject
// bare/unknown agents outright.
const USER_AGENT =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface BitnodesOptions {
    source: NodeSource;
    pollMs?: number;
    cacheDir?: string;           // where snapshot.json + quota.json live
    fixturePath?: string;        // last-resort fallback for http sources
    maxRequestsPerDay?: number;
    onUpdate?: (snap: NodeSnapshot) => void;
    onError?: (err: unknown) => void;
}

interface CacheFile { fetchedAt: number; raw: unknown }
interface QuotaFile { date: string; count: number }

const utcDay = (): string => new Date().toISOString().slice(0, 10);

function assertSnapshotShape(x: unknown): asserts x is BitnodesSnapshotRaw {
    if (typeof x !== "object" || x === null) throw new Error("node snapshot: not an object");
    const o = x as Record<string, unknown>;
    if (typeof o.timestamp !== "number" || typeof o.latest_height !== "number") {
        throw new Error("node snapshot: missing timestamp / latest_height");
    }
    if (typeof o.nodes !== "object" || o.nodes === null) {
        throw new Error("node snapshot: missing nodes map");
    }
}

export class BitnodesSource {
    private latest: NodeSnapshot | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private readonly pollMs: number;
    private readonly cacheDir: string;
    private readonly maxPerDay: number;

    constructor(private readonly opts: BitnodesOptions) {
        this.pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
        this.cacheDir = opts.cacheDir ?? ".cache";
        this.maxPerDay = opts.maxRequestsPerDay ?? DEFAULT_MAX_PER_DAY;
    }

    getLatest(): NodeSnapshot | null {
        return this.latest;
    }

    async start(): Promise<void> {
        await this.refresh();
        if (this.opts.source.kind === "http") {
            this.timer = setInterval(() => void this.refresh(), this.pollMs);
        }
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    // ---- cache -------------------------------------------------------------
    private get cachePath(): string { return join(this.cacheDir, "snapshot.json"); }
    private get quotaPath(): string { return join(this.cacheDir, "quota.json"); }

    private async readCache(): Promise<CacheFile | null> {
        try {
            return JSON.parse(await readFile(this.cachePath, "utf8")) as CacheFile;
        } catch {
            return null;
        }
    }

    private async writeCache(raw: unknown): Promise<void> {
        await mkdir(this.cacheDir, { recursive: true });
        const payload: CacheFile = { fetchedAt: Date.now(), raw };
        await writeFile(this.cachePath, JSON.stringify(payload), "utf8");
    }

    // ---- quota -------------------------------------------------------------
    private async readQuota(): Promise<QuotaFile> {
        try {
            const q = JSON.parse(await readFile(this.quotaPath, "utf8")) as QuotaFile;
            return q.date === utcDay() ? q : { date: utcDay(), count: 0 }; // new UTC day = reset
        } catch {
            return { date: utcDay(), count: 0 };
        }
    }

    private async bumpQuota(): Promise<number> {
        const q = await this.readQuota();
        q.count += 1;
        await mkdir(this.cacheDir, { recursive: true });
        await writeFile(this.quotaPath, JSON.stringify(q), "utf8");
        return q.count;
    }

    // ---- fetch -------------------------------------------------------------
    private async fetchRaw(url: string, apiToken?: string): Promise<unknown> {
        const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "application/json" };
        if (apiToken) headers["Authorization"] = `Token ${apiToken}`;
        const res = await fetch(url, { headers });
        if (res.status === 429) {
            const retry = res.headers.get("retry-after");
            throw new Error(`rate limited (429)${retry ? ` — retry after ${retry}s` : ""}`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    private async loadFixture(path: string): Promise<unknown> {
        return JSON.parse(await readFile(path, "utf8"));
    }

    // ---- the fallback chain ------------------------------------------------
    private async refresh(): Promise<void> {
        const src = this.opts.source;
        try {
            // Fixture source: trivial path, no cache/quota involved.
            if (src.kind === "fixture") {
                const raw = await this.loadFixture(src.path);
                this.publish(raw, "fixture");
                return;
            }

            // 1. fresh cache? use it, spend nothing.
            const cache = await this.readCache();
            const age = cache ? Date.now() - cache.fetchedAt : Infinity;
            if (cache && age < this.pollMs) {
                this.publish(cache.raw, `cache, ${Math.round(age / 60000)}m old`);
                return;
            }

            // 2. quota left? fetch live.
            const quota = await this.readQuota();
            if (quota.count < this.maxPerDay) {
                try {
                    const raw = await this.fetchRaw(src.url, src.apiToken);
                    assertSnapshotShape(raw);
                    await this.writeCache(raw);
                    const used = await this.bumpQuota();
                    this.publish(raw, `live · ${used}/${this.maxPerDay} requests used today`);
                    return;
                } catch (err) {
                    console.warn(`[nodes] live fetch failed (${err instanceof Error ? err.message : err}) — falling back`);
                    console.warn("  cause:", err instanceof Error ? (err.cause ?? err.message) : err);

                }
            } else {
                console.warn(`[nodes] daily quota spent (${quota.count}/${this.maxPerDay}) — using cache`);
            }

            // 3. stale cache beats nothing.
            if (cache) {
                this.publish(cache.raw, `STALE cache, ${Math.round(age / 3600000)}h old`);
                return;
            }

            // 4. last resort: the dev fixture.
            if (this.opts.fixturePath) {
                const raw = await this.loadFixture(this.opts.fixturePath);
                this.publish(raw, "fixture (no cache available)");
                return;
            }

            throw new Error("no live data, no cache, no fixture");
        } catch (err) {
            this.opts.onError?.(err);
            console.error("[nodes] refresh failed:", err instanceof Error ? err.message : err);
        }
    }

    private publish(raw: unknown, provenance: string): void {
        assertSnapshotShape(raw);
        const snap = normalizeNodeSnapshot(raw);
        this.latest = snap;
        this.opts.onUpdate?.(snap);
        console.log(
            `[nodes] ${snap.located.length} located + ${snap.unlocatableCount} unlocatable ` +
            `= ${snap.totalReachable} nodes @ height ${snap.chainHeight}  (${provenance})`,
        );
    }
}
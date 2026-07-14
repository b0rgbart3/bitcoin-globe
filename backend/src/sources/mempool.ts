// ============================================================================
// backend/src/sources/mempool.ts
// The live mempool.space socket. Emits continuous MempoolState (the breath) AND
// discrete Block events (the heartbeat) — both arrive on this one connection.
// ============================================================================

import { WebSocket } from "ws";
import type {
  MempoolInfoRaw, FeeEstimatesRaw, MempoolState, BlockRaw, Block,
} from "@btcglobe/shared/types";
import { toMempoolState, normalizeBlock } from "@btcglobe/shared/normalize";

const WS_URL = "wss://mempool.space/api/v1/ws";
const RECONNECT_MS = 5000;

const ZERO_FEES: FeeEstimatesRaw = {
  fastestFee: 0, halfHourFee: 0, hourFee: 0, economyFee: 0, minimumFee: 0,
};

export interface MempoolOptions {
  onUpdate?: (state: MempoolState) => void;  // continuous
  onBlock?: (block: Block) => void;          // discrete — the heartbeat trigger
  onError?: (err: unknown) => void;
}

export class MempoolSource {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private latest: MempoolState | null = null;
  private info: MempoolInfoRaw | null = null;
  private vbps = 0;
  private fees: FeeEstimatesRaw = ZERO_FEES;
  private lastBlockHeight: number | null = null;

  constructor(private readonly opts: MempoolOptions = {}) { }

  getLatest(): MempoolState | null {
    return this.latest;
  }

  start(): void {
    this.connect();
  }

  stop(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  private connect(): void {
    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.on("open", () => {
      ws.send(JSON.stringify({ action: "want", data: ["stats", "mempool-blocks", "blocks"] }));
      console.log("[mempool] connected to mempool.space");
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // --- continuous: mempool breath ---
        let changed = false;
        if (msg.mempoolInfo) { this.info = msg.mempoolInfo as MempoolInfoRaw; changed = true; }
        if (typeof msg.vBytesPerSecond === "number") { this.vbps = msg.vBytesPerSecond; changed = true; }
        if (msg.fees) { this.fees = msg.fees as FeeEstimatesRaw; }
        if (changed && this.info) {
          this.latest = toMempoolState(this.info, this.vbps, this.fees);
          this.opts.onUpdate?.(this.latest);
        }

        // --- prime the tip height from the initial history (no heartbeat) ---
        if (Array.isArray(msg.blocks) && msg.blocks.length && this.lastBlockHeight === null) {
          this.lastBlockHeight = Math.max(...msg.blocks.map((b: any) => b?.height ?? 0));
        }

        // --- discrete: a genuinely new block -> heartbeat ---
        if (msg.block) {
          const block = normalizeBlock(msg.block as BlockRaw);
          if (this.lastBlockHeight === null || block.height > this.lastBlockHeight) {
            this.lastBlockHeight = block.height;
            this.opts.onBlock?.(block);
            console.log(`[mempool] new block ${block.height} · ${block.txCount} txs · ${block.pool.name}`);
          }
        }
      } catch (err) {
        this.opts.onError?.(err);
      }
    });

    ws.on("close", () => {
      console.warn(`[mempool] disconnected — reconnecting in ${RECONNECT_MS / 1000}s`);
      this.scheduleReconnect();
    });

    ws.on("error", (err) => {
      this.opts.onError?.(err);
      console.error("[mempool] error:", err instanceof Error ? err.message : err);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_MS);
  }
}
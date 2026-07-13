// ============================================================================
// shared/normalize.ts
// The `raw -> domain` mapping layer (the "Normalize" box in the architecture).
// Pure functions only: same input -> same output, no I/O, no side effects.
// If an external API renames a field, exactly one function here changes.
// ============================================================================

import type {
  BitnodesSnapshotRaw, GlobeNode, NodeSnapshot,
  MempoolInfoRaw, FeeEstimatesRaw, MempoolState,
  MempoolBlockRaw, CandidateBlock,
  BlockRaw, Block,
  TxRaw, Tx,
} from "./types";

const MAX_BLOCK_WEIGHT = 4_000_000;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

// "/Satoshi:26.0.0/" -> "Satoshi:26.0.0"  (strip wrapping slashes, take first impl)
function parseClient(userAgent: string): string {
  const trimmed = userAgent.replace(/^\/+|\/+$/g, "");
  return trimmed.split("/")[0] || userAgent;
}


// ---------------------------------------------------------------------------
// 1. NODES  (Bitnodes snapshot -> globe census)
//    Decision: a node with null lat/lng is not "missing data" — it's a real
//    node that is honestly unlocatable (Tor). It goes to the count, not the map.
// ---------------------------------------------------------------------------
export function normalizeNodeSnapshot(raw: BitnodesSnapshotRaw): NodeSnapshot {
  const located: GlobeNode[] = [];
  let unlocatableCount = 0;

  for (const [id, t] of Object.entries(raw.nodes)) {
    const lat = t[8];
    const lng = t[9];

    // `== null` catches both null and a malformed/short tuple (undefined).
    if (lat == null || lng == null) {
      unlocatableCount++;
      continue;
    }

    located.push({
      id,
      lat,
      lng,
      countryCode: t[7],
      client: parseClient(t[1]),
      asn: t[11],
    });
  }

  return {
    at: raw.timestamp,
    // Derived so located + unlocatable always reconcile with the total shown in
    // the UI. Should equal raw.total_nodes; if it drifts, trust the parts.
    totalReachable: located.length + unlocatableCount,
    located,
    unlocatableCount,
    chainHeight: raw.latest_height,
  };
}


// ---------------------------------------------------------------------------
// 2. MEMPOOL  (three separate WS fields -> one continuous target)
//    mempoolInfo, vBytesPerSecond, and fees arrive together on the stats push.
// ---------------------------------------------------------------------------
export function toMempoolState(
  info: MempoolInfoRaw,
  vBytesPerSecond: number,
  fees: FeeEstimatesRaw,
  at: number = Math.floor(Date.now() / 1000),
): MempoolState {
  return {
    at,
    pendingCount: info.size,
    pendingVBytes: info.bytes,
    intakeVBytesPerSec: vBytesPerSecond,
    totalFeeBtc: info.total_fee,
    fees: {
      fastest: fees.fastestFee,
      halfHour: fees.halfHourFee,
      hour: fees.hourFee,
      economy: fees.economyFee,
      minimum: fees.minimumFee,
    },
  };
}


// ---------------------------------------------------------------------------
// 3. CANDIDATE BLOCKS  (the assembling next block[s])
//    Array order IS the projection order: index 0 = the next block to be mined.
// ---------------------------------------------------------------------------
export function normalizeCandidateBlocks(raw: MempoolBlockRaw[]): CandidateBlock[] {
  return raw.map((b, index) => ({
    index,
    vsize: b.blockVSize,
    txCount: b.nTx,
    totalFeesSat: b.totalFees,
    medianFeerate: b.medianFee,
    feeRange: b.feeRange,
  }));
}


// ---------------------------------------------------------------------------
// 4. BLOCK  (confirmed block -> ripple trigger)
//    Decisions: fullness comes from WEIGHT, not size (SegWit); pool may be
//    absent on some instances, so fall back rather than crash.
// ---------------------------------------------------------------------------
export function normalizeBlock(raw: BlockRaw): Block {
  const pool = raw.extras?.pool;

  return {
    hash: raw.id,
    height: raw.height,
    minedAt: raw.timestamp,
    txCount: raw.tx_count,
    sizeBytes: raw.size,
    weight: raw.weight,
    fullness: clamp01(raw.weight / MAX_BLOCK_WEIGHT),
    totalFeesSat: raw.extras?.totalFees ?? 0,
    medianFeerate: raw.extras?.medianFee ?? 0,
    feeRange: raw.extras?.feeRange ?? [],
    pool: pool
      ? { name: pool.name, slug: pool.slug }
      : { name: "Unknown", slug: "unknown" },
  };
}


// ---------------------------------------------------------------------------
// 5. TRANSACTION  (mempool/block tx -> treemap square)
//    Decision: feerate is derived here (fee / vsize) and guarded against the
//    div-by-zero a 0-vsize record would cause.
// ---------------------------------------------------------------------------
export function normalizeTx(raw: TxRaw): Tx {
  return {
    txid: raw.txid,
    vsize: raw.vsize,
    fee: raw.fee,
    value: raw.value,
    feerate: raw.vsize > 0 ? raw.fee / raw.vsize : 0,
  };
}

export const normalizeTxs = (raw: TxRaw[]): Tx[] => raw.map(normalizeTx);

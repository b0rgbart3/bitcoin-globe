// ============================================================================
// shared/types.ts
// The single contract shared across the backend and the React/Three frontend.
//
// Each section has two halves:
//   *Raw    = exactly what the external API returns (the wire shape)
//   Domain  = the clean shape your scene consumes (backend maps Raw -> Domain)
//
// Field names on the Raw side are confirmed against Bitnodes and mempool.space
// responses, but pin them against the live docs when you wire it up — providers
// occasionally rename or gate fields (e.g. block `extras`).
// ============================================================================


// ---------------------------------------------------------------------------
// 1. NODES  (Bitnodes)  ->  positions the globe  [slow: refresh ~hourly]
//    GET https://bitnodes.io/api/v1/snapshots/latest/
// ---------------------------------------------------------------------------

// Bitnodes returns each node as a POSITIONAL tuple, not an object.
// Order is fixed by their API. Tor/unreachable-by-IP nodes have null lat/lng.
export type BitnodesNodeTuple = [
  protocolVersion: number,      // 0
  userAgent: string,            // 1   e.g. "/Satoshi:26.0.0/"
  connectedSince: number,       // 2   unix seconds
  services: number,             // 3
  height: number,               // 4
  hostname: string | null,      // 5
  city: string | null,          // 6
  countryCode: string | null,   // 7   e.g. "DE"
  latitude: number | null,      // 8   <- NULL = unlocatable (Tor) -> the halo
  longitude: number | null,     // 9   <- NULL = unlocatable (Tor) -> the halo
  timezone: string | null,      // 10
  asn: string | null,           // 11  e.g. "AS24940"
  organization: string | null,  // 12  e.g. "Hetzner Online GmbH"
];

export interface BitnodesSnapshotRaw {
  timestamp: number;
  total_nodes: number;
  latest_height: number;
  nodes: Record<string, BitnodesNodeTuple>; // key = "ip:port" (or "xxx.onion:port")
}

// One located node = one instanced point on the globe.
export interface GlobeNode {
  id: string;                 // "ip:port" — stable key, never displayed
  lat: number;                // guaranteed non-null here (located only)
  lng: number;
  countryCode: string | null;
  client: string;             // parsed from userAgent, e.g. "Satoshi:26.0.0"
  asn: string | null;         // hosting provider / network
}

// The whole census, split into what maps and what honestly can't.
export interface NodeSnapshot {
  at: number;                 // snapshot unix seconds
  totalReachable: number;     // located + unlocatable (the honest network size)
  located: GlobeNode[];       // -> globe points
  unlocatableCount: number;   // null-coord (Tor) nodes -> the off-globe halo count
  chainHeight: number;
}


// ---------------------------------------------------------------------------
// 2. MEMPOOL  (mempool.space WS `stats`)  ->  the CONTINUOUS target
//    the render loop eases toward this every frame  [fast: ~1-2s]
// ---------------------------------------------------------------------------

export interface MempoolInfoRaw {
  size: number;        // count of pending transactions
  bytes: number;       // total vBytes pending  -> reservoir level
  total_fee: number;   // total fees sitting in the mempool (BTC)
  // (maxmempool, mempoolminfee, minrelaytxfee, ... exist but the scene ignores them)
}

export interface FeeEstimatesRaw {
  fastestFee: number;  // all values are sat/vB
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

// Pushed alongside the above on the same channel: `vBytesPerSecond: number`.

export interface MempoolState {
  at: number;
  pendingCount: number;         // <- mempoolInfo.size
  pendingVBytes: number;        // <- mempoolInfo.bytes      (reservoir level)
  intakeVBytesPerSec: number;   // <- vBytesPerSecond        (flow intensity)
  totalFeeBtc: number;          // <- mempoolInfo.total_fee
  fees: {                       // sat/vB
    fastest: number;
    halfHour: number;
    hour: number;
    economy: number;
    minimum: number;
  };
}


// ---------------------------------------------------------------------------
// 3. CANDIDATE BLOCKS  (mempool.space WS `mempool-blocks`)
//    the next block(s) assembling live  [fast: recomputed ~2s]
// ---------------------------------------------------------------------------

export interface MempoolBlockRaw {
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;    // sats
  medianFee: number;    // sat/vB
  feeRange: number[];   // ascending sat/vB buckets, low..high
}

export interface CandidateBlock {
  index: number;          // 0 = the very next block to be mined
  vsize: number;          // <- blockVSize  (~1,000,000 vB = "full")
  txCount: number;        // <- nTx
  totalFeesSat: number;   // <- totalFees
  medianFeerate: number;  // <- medianFee   (sat/vB) -> color
  feeRange: number[];     // <- feeRange
}


// ---------------------------------------------------------------------------
// 4. BLOCK  (mempool.space WS `blocks`)  ->  spawns a propagation ripple
//    [discrete: ~every 10 min, unpredictable]
// ---------------------------------------------------------------------------

export interface BlockExtrasRaw {
  totalFees: number;    // sats
  medianFee: number;    // sat/vB
  feeRange: number[];
  reward: number;       // subsidy + fees (sats)
  pool: { id: number; name: string; slug: string };
}

export interface BlockRaw {
  id: string;                 // block hash
  height: number;
  timestamp: number;          // unix seconds (miner-set; not strictly monotonic)
  tx_count: number;
  size: number;               // serialized bytes
  weight: number;             // weight units (cap 4,000,000)
  previousblockhash: string;
  extras: BlockExtrasRaw;
}

export interface Block {
  hash: string;               // <- id
  height: number;
  minedAt: number;            // <- timestamp
  txCount: number;            // <- tx_count
  sizeBytes: number;          // <- size (the "MB" display figure)
  weight: number;             // <- weight
  fullness: number;           // derived: weight / 4_000_000  (0..1, the real "full")
  totalFeesSat: number;       // <- extras.totalFees
  medianFeerate: number;      // <- extras.medianFee
  feeRange: number[];         // <- extras.feeRange
  pool: { name: string; slug: string }; // <- extras.pool
}


// ---------------------------------------------------------------------------
// 5. TRANSACTION  (block tx list / GET /api/mempool/recent)
//    the treemap squares  [on-demand: fetched when a block is opened]
// ---------------------------------------------------------------------------

export interface TxRaw {
  txid: string;
  fee: number;     // sats
  vsize: number;   // virtual bytes
  value: number;   // sum of outputs, sats
}

export interface Tx {
  txid: string;
  vsize: number;   // -> square AREA
  fee: number;     // sats
  value: number;   // sats moved — TOOLTIP ONLY, never encoded in size or color
  feerate: number; // derived: fee / vsize  -> square COLOR
}


// ---------------------------------------------------------------------------
// 6. GATEWAY MESSAGES  (your Node backend -> browser, over your own WS)
//    the union the frontend switches on. Note how each variant maps to a tempo.
// ---------------------------------------------------------------------------

export type ServerMessage =
  | { type: "nodes";      data: NodeSnapshot }        // slow: on connect + hourly
  | { type: "mempool";    data: MempoolState }        // continuous: ~1-2s
  | { type: "candidates"; data: CandidateBlock[] }    // continuous: ~2s
  | { type: "block";      data: Block }               // discrete: on new block
  | { type: "txs";        data: { blockHash: string; txs: Tx[] } }; // on-demand
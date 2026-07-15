// ============================================================================
// frontend/src/net/useNetworkSocket.ts
// One connection, both tempos. Nodes + mempool as before; now also `block` —
// a rare (~10 min) event, so plain state is fine; the Heartbeat spawns off it.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import type { NodeSnapshot, MempoolState, Block, ServerMessage, Tx } from "@btcglobe/shared/types";

const GATEWAY_URL = "ws://localhost:8787";

export function useNetworkSocket() {
  const [snapshot, setSnapshot] = useState<NodeSnapshot | null>(null);
  const [mempool, setMempool] = useState<MempoolState | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const mempoolRef = useRef<MempoolState | null>(null);
  const txQueueRef = useRef<Tx[]>([]);
  const [txStats, setTxStats] = useState<{ rate: number; medianFeerate: number; sinceBlock: number, sampled: boolean } | null>(null);
  const arrivalsRef = useRef<{ t: number; feerate: number }[]>([]);
  const sinceBlockRef = useRef(0);

  // with your other refs:
  const seenRef = useRef(new Set<string>());
  const primedRef = useRef(false);

  useEffect(() => {
    const ws = new WebSocket(GATEWAY_URL);

    ws.onmessage = (ev) => {
      const msg: ServerMessage = JSON.parse(ev.data as string);
      switch (msg.type) {
        case "nodes":
          setSnapshot(msg.data);
          break;
        case "mempool":
          mempoolRef.current = msg.data;
          setMempool(msg.data);
          break;
        case "tx-stream": {
          const now = Date.now() / 1000;

          // The feed is a rolling "latest 6" window, so batches overlap. Dedup by txid
          // so each real transaction becomes exactly ONE mote and counts ONCE.
          const fresh: Tx[] = [];
          for (const tx of msg.data) {
            if (seenRef.current.has(tx.txid)) continue;
            seenRef.current.add(tx.txid);
            fresh.push(tx);
          }
          if (seenRef.current.size > 5000) {
            seenRef.current = new Set([...seenRef.current].slice(-2000)); // Sets keep insertion order
          }

          // Zero overlap = the window filled completely between pushes, so arrivals were
          // almost certainly dropped. Dupes are our proof of headroom; no dupes means
          // we're sampling, not observing.
          const sampled = primedRef.current && fresh.length === msg.data.length;
          primedRef.current = true;

          txQueueRef.current.push(...fresh);
          if (txQueueRef.current.length > 500) {
            txQueueRef.current.splice(0, txQueueRef.current.length - 500);
          }

          for (const tx of fresh) arrivalsRef.current.push({ t: now, feerate: tx.feerate });
          const cutoff = now - 30;
          while (arrivalsRef.current.length && arrivalsRef.current[0]!.t < cutoff) {
            arrivalsRef.current.shift();
          }
          sinceBlockRef.current += fresh.length;

          const arr = arrivalsRef.current;
          const span = arr.length > 1 ? arr[arr.length - 1]!.t - arr[0]!.t : 0;
          const rate = span > 1 ? arr.length / span : 0;
          const sorted = arr.map((a) => a.feerate).sort((a, b) => a - b);
          const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;

          setTxStats({ rate, medianFeerate: median, sinceBlock: sinceBlockRef.current, sampled });
          break;
        }
        case "block":
          setBlock(msg.data);
          sinceBlockRef.current = 0; // the pulse clears the count
          break;
        default:
          break;
      }
    };

    ws.onclose = () => console.warn("[ws] disconnected from gateway");
    ws.onerror = () => console.warn("[ws] gateway connection error");

    return () => ws.close();
  }, []);

  return { snapshot, mempool, mempoolRef, block, txQueueRef, txStats };
}
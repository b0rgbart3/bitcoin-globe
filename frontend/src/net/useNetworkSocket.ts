// ============================================================================
// frontend/src/net/useNetworkSocket.ts
// One connection, both tempos. Nodes + mempool as before; now also `block` —
// a rare (~10 min) event, so plain state is fine; the Heartbeat spawns off it.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import type { NodeSnapshot, MempoolState, Block, ServerMessage } from "@btcglobe/shared/types";

const GATEWAY_URL = "ws://localhost:8787";

export function useNetworkSocket() {
  const [snapshot, setSnapshot] = useState<NodeSnapshot | null>(null);
  const [mempool, setMempool] = useState<MempoolState | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const mempoolRef = useRef<MempoolState | null>(null);

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
        case "block":
          setBlock(msg.data); // rare event -> drives the heartbeat ripple
          break;
        default:
          break;
      }
    };

    ws.onclose = () => console.warn("[ws] disconnected from gateway");
    ws.onerror = () => console.warn("[ws] gateway connection error");

    return () => ws.close();
  }, []);

  return { snapshot, mempool, mempoolRef, block };
}
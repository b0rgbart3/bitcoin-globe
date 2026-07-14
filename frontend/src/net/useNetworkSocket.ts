// ============================================================================
// frontend/src/net/useNetworkSocket.ts
// One connection, two tempos. Nodes -> React state (slow, rare). Mempool -> a
// ref (read every frame by the atmosphere) AND state (for the HUD, ~1-2s).
// Replaces useNodeSocket.ts.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import type { NodeSnapshot, MempoolState, ServerMessage } from "@btcglobe/shared/types";

const GATEWAY_URL = "ws://localhost:8787";

export function useNetworkSocket() {
  const [snapshot, setSnapshot] = useState<NodeSnapshot | null>(null);
  const [mempool, setMempool] = useState<MempoolState | null>(null);
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
          mempoolRef.current = msg.data; // fast path — read in useFrame, no re-render
          setMempool(msg.data);          // slow path — HUD only (drop this if unused)
          break;
        default:
          break;
      }
    };

    ws.onclose = () => console.warn("[ws] disconnected from gateway");
    ws.onerror = () => console.warn("[ws] gateway connection error");

    return () => ws.close();
  }, []);

  return { snapshot, mempool, mempoolRef };
}

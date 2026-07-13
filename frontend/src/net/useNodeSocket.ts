// ============================================================================
// frontend/src/net/useNodeSocket.ts
// Connects to the backend gateway and returns the latest NodeSnapshot.
//
// NOTE ON useState: the node snapshot arrives rarely (on connect, then hourly),
// so React state is exactly right here. The "never useState" rule is only for
// per-frame animation data (mempool intake, ripples) — this is not that.
// ============================================================================

import { useEffect, useState } from "react";
import type { NodeSnapshot, ServerMessage } from "@btcglobe/shared/types";

const GATEWAY_URL = "ws://localhost:8787";

export function useNodeSocket(): NodeSnapshot | null {
    const [snapshot, setSnapshot] = useState<NodeSnapshot | null>(null);

    useEffect(() => {
        const ws = new WebSocket(GATEWAY_URL);

        ws.onmessage = (ev) => {
            const msg: ServerMessage = JSON.parse(ev.data as string);
            switch (msg.type) {
                case "nodes":
                    setSnapshot(msg.data);
                    break;
                // "mempool" | "candidates" | "block" | "txs" handled in later slices
                default:
                    break;
            }
        };

        ws.onclose = () => console.warn("[ws] disconnected from gateway");
        ws.onerror = () => console.warn("[ws] gateway connection error");

        return () => ws.close();
    }, []);

    return snapshot;
}

// ============================================================================
// backend/src/gateway/ws.ts
// Your own WebSocket server — the single door between the backend and browsers.
// On connect it sends the current snapshot; broadcast() fans out later updates.
// It only ever emits the shared ServerMessage union, so the frontend switch()
// stays in lockstep with the backend.
// ============================================================================

import { WebSocketServer, WebSocket } from "ws";
import type { ServerMessage, NodeSnapshot } from "@btcglobe/shared/types";

export interface GatewayOptions {
    port: number;
    getInitial?: () => NodeSnapshot | null; // sent to each client the moment it connects
}

export class Gateway {
    private readonly wss: WebSocketServer;

    constructor(private readonly opts: GatewayOptions) {
        this.wss = new WebSocketServer({ port: opts.port });

        this.wss.on("connection", (ws) => {
            const snap = opts.getInitial?.();
            if (snap) this.sendTo(ws, { type: "nodes", data: snap });
            console.log(`[gateway] client connected (${this.wss.clients.size} total)`);
            ws.on("close", () =>
                console.log(`[gateway] client left (${this.wss.clients.size} total)`),
            );
        });

        console.log(`[gateway] listening on ws://localhost:${opts.port}`);
    }

    private sendTo(ws: WebSocket, msg: ServerMessage): void {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    }

    // Push a message to every connected client.
    broadcast(msg: ServerMessage): void {
        const payload = JSON.stringify(msg);
        for (const ws of this.wss.clients) {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        }
    }
}

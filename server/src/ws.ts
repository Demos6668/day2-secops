/**
 * WebSocket fan-out bridge.
 *
 * The frontend's optional ServerSource subscribes to /api/events and receives
 * pushes whenever a webhook lands or the snapshot store changes. We keep this
 * tiny — no rooms, no auth (read-only stream of public visibility data).
 */

import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer | null = null;

export function attachWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/api/events" });
  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "hello", at: Date.now() }));
  });
  return wss;
}

export interface BroadcastMessage {
  type: "visibility_update" | "snapshot_taken" | "event";
  toolId?: string;
  payload?: unknown;
  at?: number;
}

export function broadcast(msg: BroadcastMessage): void {
  if (!wss) return;
  const text = JSON.stringify({ ...msg, at: msg.at ?? Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(text);
      } catch {
        // ignore broken socket
      }
    }
  }
}

/**
 * Notification inbox store with smart aggregation.
 *
 * Same tool + same kind events that arrive within INBOX_AGGREGATION_WINDOW_MS
 * collapse into a single bucket with a count, instead of stacking 40 rows for
 * the same flapping tool.
 */

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  buildBucketKey,
  INBOX_AGGREGATION_WINDOW_MS,
  type NotificationEvent,
} from "@/lib/notifications/budget";

const KEY = "abcl-secviz:notifications";
const EVT = "abcl-secviz:notifications-changed";
const INBOX_OPEN_EVT = "abcl-secviz:inbox-open-changed";
const MAX_EVENTS = 150;

const NotificationEventSchema = z.object({
  id: z.string(),
  at: z.number(),
  key: z.string(),
  title: z.string(),
  description: z.string().optional(),
  kind: z.enum(["rag_flip", "cause_added", "cause_cleared", "recovered", "info"]),
  severity: z.enum(["Critical", "Moderate", "Low"]),
  toastFired: z.boolean(),
  toolId: z.string().optional(),
  fromStatus: z.enum(["green", "amber", "red"]).optional(),
  toStatus: z.enum(["green", "amber", "red"]).optional(),
  read: z.boolean(),
  count: z.number().int().positive().optional(),
});
const StoreSchema = z.object({ events: z.array(NotificationEventSchema).default([]) });

interface StoreShape {
  events: NotificationEvent[];
}

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { events: [] };
    const parsed = StoreSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { events: [] };
    return parsed.data as StoreShape;
  } catch {
    return { events: [] };
  }
}

function writeStore(s: StoreShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // quota — keep in-memory state, skip persistence.
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

export function pushNotification(event: NotificationEvent): void {
  const s = readStore();
  const bucket = buildBucketKey({ toolId: event.toolId, kind: event.kind });
  const cutoff = event.at - INBOX_AGGREGATION_WINDOW_MS;

  const idx = s.events.findIndex(
    (e) => buildBucketKey({ toolId: e.toolId, kind: e.kind }) === bucket && e.at >= cutoff,
  );

  if (idx >= 0) {
    const existing = s.events[idx];
    const updated: NotificationEvent = {
      ...existing,
      at: event.at,
      title: event.title,
      description: event.description ?? existing.description,
      count: (existing.count ?? 1) + 1,
      toastFired: existing.toastFired || event.toastFired,
      read: false,
    };
    const next = [updated, ...s.events.filter((_, i) => i !== idx)].slice(0, MAX_EVENTS);
    writeStore({ events: next });
    return;
  }

  const next = [event, ...s.events].slice(0, MAX_EVENTS);
  writeStore({ events: next });
}

export function listNotifications(): NotificationEvent[] {
  return readStore().events;
}

export function markAllRead(): void {
  const s = readStore();
  writeStore({ events: s.events.map((e) => ({ ...e, read: true })) });
}

export function clearAll(): void {
  writeStore({ events: [] });
}

export function unreadCount(): number {
  return readStore().events.filter((e) => !e.read).length;
}

let inboxOpenState = false;

export function setInboxOpen(v: boolean): void {
  inboxOpenState = v;
  window.dispatchEvent(new CustomEvent(INBOX_OPEN_EVT, { detail: v }));
}

export function isInboxOpen(): boolean {
  return inboxOpenState;
}

export function useNotifications() {
  const [events, setEvents] = useState<NotificationEvent[]>(() => listNotifications());

  useEffect(() => {
    const handler = () => setEvents(listNotifications());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const unread = events.filter((e) => !e.read).length;
  const markRead = useCallback(() => markAllRead(), []);
  const clear = useCallback(() => clearAll(), []);
  return { events, unread, markRead, clear };
}

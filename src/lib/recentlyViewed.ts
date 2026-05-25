import { z } from "zod";

const STORAGE_KEY = "abcl-secviz:recently-viewed";
const MAX_ITEMS = 20;

export type RecentItemType = "tool" | "control" | "snapshot";

export interface RecentItem {
  id: string;
  type: RecentItemType;
  title: string;
  visitedAt: string;
}

const RecentItemSchema = z.object({
  id: z.string(),
  type: z.enum(["tool", "control", "snapshot"]),
  title: z.string(),
  visitedAt: z.string(),
});
const RecentArraySchema = z.array(RecentItemSchema);

export function getRecentItems(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // SEC C-2 / CODE H-3: validate-on-read so XSS-injected payloads or
    // stale-schema data can't reach React unchecked.
    const parsed = RecentArraySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data;
  } catch {
    return [];
  }
}

export function addRecentItem(item: Omit<RecentItem, "visitedAt">): RecentItem[] {
  const existing = getRecentItems();
  const deduped = existing.filter((r) => !(r.id === item.id && r.type === item.type));
  const updated: RecentItem[] = [
    { ...item, visitedAt: new Date().toISOString() },
    ...deduped,
  ].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // quota exceeded — silently skip
  }
  return updated;
}

export function removeRecentItem(id: string, type: RecentItemType): RecentItem[] {
  const updated = getRecentItems().filter((r) => !(r.id === id && r.type === type));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // quota exceeded — silently skip
  }
  return updated;
}

export function clearRecentItems(): void {
  localStorage.removeItem(STORAGE_KEY);
}

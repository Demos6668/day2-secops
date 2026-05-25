import { useState, useCallback, useEffect } from "react";
import {
  getRecentItems,
  addRecentItem,
  removeRecentItem,
  clearRecentItems,
  type RecentItem,
  type RecentItemType,
} from "@/lib/recentlyViewed";

const STORAGE_KEY = "abcl-secviz:recently-viewed";
const SAME_TAB_EVENT = "abcl-secviz:history-updated";

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>(() => getRecentItems());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(getRecentItems());
    };
    const onSameTab = () => setItems(getRecentItems());
    window.addEventListener("storage", onStorage);
    window.addEventListener(SAME_TAB_EVENT, onSameTab);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SAME_TAB_EVENT, onSameTab);
    };
  }, []);

  const add = useCallback((item: { id: string; type: RecentItemType; title: string }) => {
    const updated = addRecentItem(item);
    setItems(updated);
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);

  const remove = useCallback((id: string, type: RecentItemType) => {
    const updated = removeRecentItem(id, type);
    setItems(updated);
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);

  const clear = useCallback(() => {
    clearRecentItems();
    setItems([]);
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, []);

  return { items, add, remove, clear };
}

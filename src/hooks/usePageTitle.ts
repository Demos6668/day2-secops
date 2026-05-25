import { useEffect } from "react";

const BASE_TITLE = "day2.OSINT";

/** Updates the browser tab title to `"<title> | day2.OSINT"` while the component is mounted. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} | ${BASE_TITLE}`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

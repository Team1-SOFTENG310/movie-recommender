import { useEffect } from "react";

const APP_NAME = "NetFlicks";

/**
 * Sets the browser tab title to "<title> · NetFlicks" (or just "NetFlicks"), so tabs,
 * history and bookmarks say which page they are. Restores the previous title on unmount.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

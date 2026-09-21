import { useEffect } from "react";

export const DRAFTS_SYNCED_EVENT = "pa-drafts-synced";

export function useDraftsSynced(onSync: () => void) {
  useEffect(() => {
    window.addEventListener(DRAFTS_SYNCED_EVENT, onSync);
    return () => window.removeEventListener(DRAFTS_SYNCED_EVENT, onSync);
  }, [onSync]);
}

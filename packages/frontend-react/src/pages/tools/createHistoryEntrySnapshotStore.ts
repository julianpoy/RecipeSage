import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

const MAX_SNAPSHOTS = 20;

const useHistoryEntryKey = () => {
  const router = useRouter();
  const [entryKey] = useState(() => router.state.location.state.__TSR_key);
  return entryKey;
};

export const createHistoryEntrySnapshotStore = <T>() => {
  const snapshots = new Map<string, T>();

  const useRestoredSnapshot = (): T | undefined => {
    const entryKey = useHistoryEntryKey();
    const [restored] = useState(() =>
      entryKey ? snapshots.get(entryKey) : undefined,
    );
    return restored;
  };

  const useSaveSnapshot = (latest: T) => {
    const entryKey = useHistoryEntryKey();
    const latestRef = useRef(latest);

    useEffect(() => {
      latestRef.current = latest;
    });

    useEffect(() => {
      if (!entryKey) return;
      return () => {
        snapshots.delete(entryKey);
        snapshots.set(entryKey, latestRef.current);
        while (snapshots.size > MAX_SNAPSHOTS) {
          const oldestKey = snapshots.keys().next().value;
          if (oldestKey === undefined) break;
          snapshots.delete(oldestKey);
        }
      };
    }, [entryKey]);
  };

  return {
    snapshots,
    useRestoredSnapshot,
    useSaveSnapshot,
  };
};

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobSummary } from "@recipesage/prisma";
import { WSBroadcastEventType } from "@recipesage/util/shared";
import { useWebsocketEvent } from "../../../hooks/useWebsocketEvent";
import { serverActions } from "../../../services/serverActions";

export const useJobsPoll = ({
  intervalMs,
  listenWebsocket,
}: {
  intervalMs: number;
  listenWebsocket: boolean;
}) => {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const consecutiveFailuresRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const load = useCallback(async () => {
    const response = await serverActions.jobs.getJobs(
      consecutiveFailuresRef.current > 0
        ? { "0": () => {}, 500: () => {} }
        : { "0": () => {} },
    );

    if (!response) {
      consecutiveFailuresRef.current++;
      return;
    }

    consecutiveFailuresRef.current = 0;
    setJobs(
      [...response].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    );
  }, []);

  const setupJobStatusPoll = useCallback(() => {
    clearInterval(intervalRef.current);
    consecutiveFailuresRef.current = 0;
    void load();

    intervalRef.current = setInterval(() => {
      void load();
    }, intervalMs);
  }, [load, intervalMs]);

  useEffect(() => {
    setupJobStatusPoll();
    return () => clearInterval(intervalRef.current);
  }, [setupJobStatusPoll]);

  useWebsocketEvent(WSBroadcastEventType.JobUpdated, () => {
    if (!listenWebsocket) return;
    void load();
  });

  return { jobs, setupJobStatusPoll };
};

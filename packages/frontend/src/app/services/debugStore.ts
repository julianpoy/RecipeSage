export const CONSOLE_LOGS_HISTORY_MAX = 500;
export const TRPC_REQUEST_HISTORY_MAX = 200;

export const store = {
  logs: [],
  trpc: [],
} as {
  logs: {
    type: string;
    datetime: string;
    value: any;
  }[];
  trpc: unknown[];
};

export function createSWDebugDump() {
  return {
    logs: store.logs,
  };
}

export function captureTrpcRequest(entry: unknown) {
  store.trpc.push(entry);
  if (store.trpc.length > TRPC_REQUEST_HISTORY_MAX) {
    store.trpc.splice(TRPC_REQUEST_HISTORY_MAX);
  }
}

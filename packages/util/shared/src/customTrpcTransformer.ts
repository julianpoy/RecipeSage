/* eslint-disable @typescript-eslint/no-explicit-any */

const dateFields = new Set([
  "createdAt",
  "updatedAt",
  "scheduled",
  "indexedAt",
  "expires",
]);

function transformDateFields<T>(payload: Record<string, any>): T {
  for (const key in payload) {
    const value = payload[key];
    if (!value) continue;

    if (dateFields.has(key)) {
      payload[key] = new Date(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "object") {
          transformDateFields(item);
        }
      }
    } else if (typeof value === "object") {
      transformDateFields(value);
    }
  }
  return payload as T;
}

export const customTrpcTransformer = {
  // This function runs on the server before sending the data to the client.
  serialize: (data: any) => data,
  // This function runs only on the client to transform the data sent from the server.
  deserialize: (data: any) => {
    return transformDateFields(data);
  },
};

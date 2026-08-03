export const xmlNodeToArray = <T>(node: T | T[] | undefined | null): T[] => {
  if (node === undefined || node === null) return [];

  return Array.isArray(node) ? node : [node];
};

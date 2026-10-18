export const searchParams = {
  parse(searchStr: string): Record<string, string> {
    return Object.fromEntries(new URLSearchParams(searchStr));
  },

  stringify(search: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined || value === null) continue;
      params.set(key, String(value));
    }
    const searchStr = params.toString();
    return searchStr ? `?${searchStr}` : "";
  },

  optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value ? value : undefined;
  },
};

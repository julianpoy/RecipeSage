export const copyStringWithoutParentReference = (value: string) =>
  Buffer.from(value, "utf16le").toString("utf16le");

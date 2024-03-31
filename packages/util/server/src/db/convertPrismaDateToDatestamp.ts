export const convertPrismaDateToDatestamp = <Z extends keyof T, T>(
  obj: T,
  fieldName: Z,
): Omit<T, Z> & {
  [key in Z]: string;
} => {
  const date = obj[fieldName];

  if (!(date instanceof Date)) {
    throw new Error("convertPrismaDate called with non-date property");
  }

  return {
    ...obj,
    [fieldName]: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`,
  };
};

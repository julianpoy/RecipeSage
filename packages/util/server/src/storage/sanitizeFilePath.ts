import path from "path";

/**
 * Normalizes a path provided by a user
 */
export function sanitizeFilePath(args: {
  mustStartWith: string;
  filePath: string;
}) {
  const resolvedPath = path.resolve(args.filePath);
  const normalizedPath = path.normalize(resolvedPath);

  if (!normalizedPath.startsWith(args.mustStartWith)) {
    throw new Error("Path would leave filesystem bounding");
  }

  return normalizedPath;
}

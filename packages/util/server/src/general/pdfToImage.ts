import { spawn } from "node:child_process";

const MAX_EXTRACT_TIME = 10000;

export const pdfToImage = async (
  source: Buffer,
  page: number,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject("Timeout while waiting for pdftoppm");
    }, MAX_EXTRACT_TIME);

    const proc = spawn("pdftoppm", [
      "-singlefile",
      "-r",
      "72",
      "-jpeg",
      "-jpegopt",
      "quality=90",
      "-f",
      String(page),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = [];
    proc.stdout.on("data", function (data) {
      result.push(data);
    });
    proc.on("close", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(result));
    });
    proc.stdin.end(source);
  });
};

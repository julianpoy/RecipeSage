import { spawn } from "node:child_process";

export class PDFToImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PDFToImageError";
  }
}

export class PDFToImageTimeoutError extends PDFToImageError {
  constructor(message: string) {
    super(message);
    this.name = "PDFToImageTimeoutError";
  }
}

const MAX_EXTRACT_TIME = 10000;

/**
 * Can take either a buffer or a file path
 */
export const pdfToImage = async (
  source: Buffer | string,
  page: number,
  quality = 85,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const isFilePath = typeof source === "string";
    const args = [
      "-singlefile",
      "-r",
      "72",
      "-jpeg",
      "-jpegopt",
      `quality=${quality}`,
      "-f",
      String(page),
    ];
    if (isFilePath) {
      args.push(source);
    }

    const proc = spawn("pdftoppm", args);

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new PDFToImageTimeoutError("Timeout while waiting for pdftoppm"));
    }, MAX_EXTRACT_TIME);

    const result: Buffer[] = [];
    let errorOutput = "";

    proc.stdout.on("data", (data) => {
      result.push(data);
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(new PDFToImageError(`Failed to spawn pdftoppm: ${err.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(Buffer.concat(result));
      } else {
        reject(
          new PDFToImageError(
            `pdftoppm exited with code ${code}: ${errorOutput}`,
          ),
        );
      }
    });

    if (!isFilePath) {
      proc.stdin.write(source, (err) => {
        if (err) {
          clearTimeout(timeout);
          proc.kill();
          reject(
            new PDFToImageError(
              `Failed to write to pdftoppm stdin: ${err.message}`,
            ),
          );
          return;
        }
        proc.stdin.end();
      });
    }
  });
};

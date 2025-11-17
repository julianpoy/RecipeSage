import { spawn } from "node:child_process";

export class ExtractTextFromPDFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractTextFromPDFError";
  }
}

const MAX_EXTRACT_TIME = 10000;

export const extractTextFromPDF = async (
  source: Buffer,
  maxPages = 1,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("pdftotext", [
      "-",
      "-",
      "-f",
      String(1),
      "-l",
      String(maxPages),
      "-layout",
    ]);

    let output = "";
    let errorOutput = "";

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Timeout while waiting for pdftotext"));
    }, MAX_EXTRACT_TIME);

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(
        new ExtractTextFromPDFError(
          `Failed to spawn pdftotext: ${err.message}`,
        ),
      );
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new ExtractTextFromPDFError(
            `pdftotext exited with code ${code}: ${errorOutput}`,
          ),
        );
      }
    });

    proc.stdin.write(source, (err) => {
      if (err) {
        clearTimeout(timeout);
        proc.kill();
        reject(
          new ExtractTextFromPDFError(
            `Failed to write to pdftotext stdin: ${err.message}`,
          ),
        );
      }
      proc.stdin.end();
    });
  });
};

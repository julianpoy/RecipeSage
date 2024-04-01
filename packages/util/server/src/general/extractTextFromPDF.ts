import { spawn } from "node:child_process";

const MAX_EXTRACT_TIME = 10000;

export const extractTextFromPDF = async (
  source: Buffer,
  maxPages?: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject("Timeout while waiting for pdftotext");
    }, MAX_EXTRACT_TIME);

    const proc = spawn("pdftotext", [
      "-",
      "-",
      "-f",
      String(1),
      "-l",
      String(maxPages),
    ]);
    proc.stdout.on("data", function (data) {
      clearTimeout(timeout);
      resolve(String(data));
    });
    proc.stdin.end(source);
  });
};

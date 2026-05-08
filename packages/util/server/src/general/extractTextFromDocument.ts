import { spawn } from "node:child_process";
import path from "node:path";

export class ExtractTextFromDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractTextFromDocumentError";
  }
}

export class ExtractTextFromDocumentTimeoutError extends ExtractTextFromDocumentError {
  constructor(message: string) {
    super(message);
    this.name = "ExtractTextFromDocumentTimeoutError";
  }
}

export class UnsupportedDocumentFormatError extends ExtractTextFromDocumentError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedDocumentFormatError";
  }
}

const MAX_EXTRACT_TIME = 30000;

const PANDOC_FORMAT_BY_EXTENSION: Record<string, string> = {
  ".rtf": "rtf",
  ".odt": "odt",
  ".docx": "docx",
  ".md": "gfm",
  ".markdown": "gfm",
  ".html": "html",
  ".htm": "html",
  ".org": "org",
};

export const isExtractableDocumentExtension = (extension: string): boolean => {
  return extension.toLowerCase() in PANDOC_FORMAT_BY_EXTENSION;
};

export const extractTextFromDocument = async (
  filePath: string,
): Promise<string> => {
  const extension = path.extname(filePath).toLowerCase();
  const pandocFormat = PANDOC_FORMAT_BY_EXTENSION[extension];
  if (!pandocFormat) {
    throw new UnsupportedDocumentFormatError(
      `Unsupported document extension: ${extension}`,
    );
  }

  return new Promise((resolve, reject) => {
    const proc = spawn("pandoc", [
      "-f",
      pandocFormat,
      "-t",
      "plain",
      "--",
      filePath,
    ]);

    let output = "";
    let errorOutput = "";

    const timeout = setTimeout(() => {
      proc.kill();
      reject(
        new ExtractTextFromDocumentTimeoutError(
          "Timeout while waiting for pandoc",
        ),
      );
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
        new ExtractTextFromDocumentError(
          `Failed to spawn pandoc: ${err.message}`,
        ),
      );
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new ExtractTextFromDocumentError(
            `pandoc exited with code ${code}: ${errorOutput}`,
          ),
        );
      }
    });
  });
};

import { spawn } from "node:child_process";
import { mkdtempDisposable, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export class DecodeHeicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecodeHeicError";
  }
}

export class DecodeHeicSpawnError extends DecodeHeicError {
  constructor(message: string) {
    super(message);
    this.name = "DecodeHeicSpawnError";
  }
}

export class DecodeHeicTimeoutError extends DecodeHeicError {
  constructor(message: string) {
    super(message);
    this.name = "DecodeHeicTimeoutError";
  }
}

export class HeicTooLargeError extends DecodeHeicError {
  constructor(message: string) {
    super(message);
    this.name = "HeicTooLargeError";
  }
}

const MAX_PROCESS_TIME = 15000;
const MAX_TOTAL_PIXELS = 120_000_000;
const MAX_CAPTURED_OUTPUT = 64 * 1024;
const INPUT_FILENAME = "input.heic";
const OUTPUT_FILENAME = "out.png";

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

const run = (command: string, args: string[], timeoutMs: number) =>
  new Promise<RunResult>((resolve, reject) => {
    const startedAt = Date.now();
    const proc = spawn(command, args, {
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    });

    let stdout = "";
    let stderr = "";
    let truncated = false;

    const capture = (current: string, chunk: string) => {
      const next = current + chunk;
      if (next.length <= MAX_CAPTURED_OUTPUT) return next;
      truncated = true;
      return next.slice(0, MAX_CAPTURED_OUTPUT);
    };

    proc.stdout.on("data", (data) => {
      stdout = capture(stdout, data.toString());
    });

    proc.stderr.on("data", (data) => {
      stderr = capture(stderr, data.toString());
    });

    proc.on("error", (err) => {
      reject(
        new DecodeHeicSpawnError(`Failed to spawn ${command}: ${err.message}`),
      );
    });

    proc.on("close", (code, signal) => {
      if (signal) {
        const message = `${command} was killed with ${signal}`;
        reject(
          Date.now() - startedAt >= timeoutMs
            ? new DecodeHeicTimeoutError(`${message} after ${timeoutMs}ms`)
            : new DecodeHeicError(message),
        );
      } else if (truncated) {
        reject(
          new DecodeHeicError(
            `${command} produced more than ${MAX_CAPTURED_OUTPUT} bytes of output, which cannot be parsed safely`,
          ),
        );
      } else {
        resolve({ code, stdout, stderr });
      }
    });
  });

export const parseHeifInfo = (heifInfoOutput: string) => {
  const imageLines = heifInfoOutput
    .split("\n")
    .filter((line) => line.startsWith("image:"));

  const images = imageLines.map((line) => {
    const match = /^image:\s*(\d+)x(\d+)/.exec(line);
    return {
      width: match ? Number(match[1]) : undefined,
      height: match ? Number(match[2]) : undefined,
    };
  });

  const primaryIndex = imageLines.findIndex((line) =>
    line.includes(", primary"),
  );

  return {
    images,
    primaryPosition: primaryIndex === -1 ? 1 : primaryIndex + 1,
    totalPixels: images.reduce(
      (total, { width, height }) => total + (width ?? 0) * (height ?? 0),
      0,
    ),
  };
};

export async function decodeHeicToFile(
  input: Buffer | string,
): Promise<{ imagePath: string } & AsyncDisposable> {
  const deadline = Date.now() + MAX_PROCESS_TIME;
  const remaining = () => {
    const left = deadline - Date.now();
    if (left <= 0) {
      throw new DecodeHeicTimeoutError(
        `Exceeded the ${MAX_PROCESS_TIME}ms decode budget`,
      );
    }
    return left;
  };

  const tempDir = await mkdtempDisposable("/tmp/");

  try {
    const inputPath =
      typeof input === "string"
        ? input
        : path.join(tempDir.path, INPUT_FILENAME);
    if (typeof input !== "string") await writeFile(inputPath, input);

    const info = await run("heif-info", ["--", inputPath], remaining());
    if (info.code !== 0) {
      throw new DecodeHeicError(
        `heif-info exited with code ${info.code}: ${info.stderr}`,
      );
    }

    const { images, primaryPosition, totalPixels } = parseHeifInfo(info.stdout);

    if (totalPixels > MAX_TOTAL_PIXELS) {
      throw new HeicTooLargeError(
        `HEIC holds ${images.length} image(s) totalling ${totalPixels} pixels, above the ${MAX_TOTAL_PIXELS} limit`,
      );
    }

    const converted = await run(
      "heif-convert",
      [
        "--quiet",
        "--png-compression-level",
        "0",
        "--",
        inputPath,
        path.join(tempDir.path, OUTPUT_FILENAME),
      ],
      remaining(),
    );

    if (converted.code !== 0) {
      throw new DecodeHeicError(
        `heif-convert exited with code ${converted.code}: ${converted.stderr}`,
      );
    }

    const imageFilename =
      images.length > 1 ? `out-${primaryPosition}.png` : OUTPUT_FILENAME;

    const written = (await readdir(tempDir.path)).filter(
      (name) => name !== INPUT_FILENAME,
    );
    if (!written.includes(imageFilename)) {
      throw new DecodeHeicError(
        `heif-convert did not write ${imageFilename}. It wrote: ${written.join(", ")}. Stderr: ${converted.stderr}`,
      );
    }

    const imagePath = path.join(tempDir.path, imageFilename);
    const expected = images[primaryPosition - 1];
    const actual = await sharp(imagePath).metadata();
    if (actual.width !== expected?.width || actual.height !== expected.height) {
      throw new DecodeHeicError(
        `Expected the primary image to be ${expected?.width}x${expected?.height} but ${imageFilename} is ${actual.width}x${actual.height}`,
      );
    }

    return {
      imagePath,
      [Symbol.asyncDispose]: () => tempDir.remove(),
    };
  } catch (e) {
    try {
      await tempDir.remove();
    } catch (removeError) {
      console.error(removeError);
    }
    throw e;
  }
}

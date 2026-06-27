import { createHash } from "crypto";
import { AbortError } from "node-fetch";
import * as Sentry from "@sentry/node";
import { Prisma, prisma } from "@recipesage/prisma";
import { fetchURL } from "../fetch";
import { StandardizedRecipeImportEntry } from "../../db";
import { metrics } from "../metrics";
import {
  ocrImagesToRecipe,
  pdfToRecipe,
  textToRecipe,
  TextToRecipeInputType,
} from "../../ml";
import {
  extractStructuredData,
  extractPageText,
  PageText,
} from "./htmlExtract";
import { htmlmetaparserToRecipe } from "./htmlmetaparserToRecipe";
import { isRecipeGrounded } from "./isRecipeGrounded";
import { normalizeClipUrl } from "./normalizeClipUrl";
import type { Result } from "htmlmetaparser";

const CLIP_CACHE_VERSION = 1;

const hashUrl = (url: string) => createHash("sha256").update(url).digest();

const isBotChallengePage = (html: string): boolean => {
  const lower = html.toLowerCase();
  return (
    lower.includes("<title>just a moment...</title>") ||
    lower.includes("<title>attention required!</title>") ||
    lower.includes("<title>access denied</title>")
  );
};

const isCompleteRecipe = (entry: StandardizedRecipeImportEntry): boolean =>
  !!(
    entry.recipe.title &&
    entry.recipe.ingredients &&
    entry.recipe.instructions
  );

const hasUsableContent = (entry: StandardizedRecipeImportEntry): boolean =>
  !!(entry.recipe.ingredients || entry.recipe.instructions);

const clipRecipeViaStructuredData = (
  structured: Result,
  source: "jsonld" | "microdata",
  pageText: string,
) => {
  metrics.clipStartedProcessing.inc({
    method: source,
  });

  return htmlmetaparserToRecipe(structured, source, pageText);
};

const clipRecipeHtmlWithLLM = async (document: string, text: string) => {
  if (isBotChallengePage(document)) return undefined;

  metrics.clipStartedProcessing.inc({
    method: "llm",
  });

  return textToRecipe(text, TextToRecipeInputType.Webpage);
};

export class ClipTimeoutError extends Error {
  constructor() {
    super();
    this.name = "ClipTimeoutError";
  }
}

export class ClipFetchError extends Error {
  constructor() {
    super();
    this.name = "ClipFetchError";
  }
}

export const clipUrl = async (
  url: string,
): Promise<StandardizedRecipeImportEntry> => {
  metrics.clipRequested.inc({
    form: "url",
  });

  const captureError = (method: string, error: unknown) => {
    metrics.clipError.inc({
      form: "url",
      method,
    });
    console.error(error);
    Sentry.captureException(error, {
      extra: {
        url,
      },
    });
  };

  const normalizedUrl = normalizeClipUrl(url);

  const urlHash = hashUrl(normalizedUrl);

  const cached = await prisma.clipCache.findUnique({
    where: { urlHash },
  });

  if (
    cached &&
    cached.url === normalizedUrl &&
    cached.clipVersion === CLIP_CACHE_VERSION
  ) {
    const cachedRecipe =
      cached.recipe as unknown as StandardizedRecipeImportEntry;
    if (isCompleteRecipe(cachedRecipe)) {
      metrics.clipCacheLookup.inc({
        result: "hit",
      });
      metrics.clipSuccess.inc({
        form: "url",
        method: "cached",
      });
      return cachedRecipe;
    }
  }

  metrics.clipCacheLookup.inc({
    result: "miss",
  });

  const response = await (async () => {
    const timeout = parseInt(
      process.env.CLIP_BROWSER_NAVIGATE_TIMEOUT || "30000",
    );

    let _url = normalizedUrl;
    if (process.env.SCRAPFLY_API_KEY) {
      const params = new URLSearchParams({
        asp: "true",
        key: process.env.SCRAPFLY_API_KEY,
        url: normalizedUrl,
        proxified_response: "true",
      });

      _url = `https://api.scrapfly.io/scrape?${params}`;
    }

    return fetchURL(_url, {
      timeout,
    });
  })().catch((e) => {
    if (e instanceof AbortError) {
      metrics.clipError.inc({
        form: "url",
        method: "timeout",
      });
      throw new ClipTimeoutError();
    }
    console.error(e);
    metrics.clipError.inc({
      form: "url",
      method: "fetch",
    });
    throw new ClipFetchError();
  });

  if (!response.ok) {
    metrics.clipError.inc({
      form: "url",
      method: "fetch",
    });
    throw new ClipFetchError();
  }

  const cacheResult = async (result: StandardizedRecipeImportEntry) => {
    await prisma.clipCache.upsert({
      where: { urlHash },
      create: {
        url: normalizedUrl,
        urlHash,
        recipe: result as unknown as Prisma.InputJsonValue,
        clipVersion: CLIP_CACHE_VERSION,
      },
      update: {
        url: normalizedUrl,
        recipe: result as unknown as Prisma.InputJsonValue,
        clipVersion: CLIP_CACHE_VERSION,
      },
    });
  };

  if (response.headers.get("content-type") === "application/pdf") {
    const pdfContent = await response.buffer();
    const result = await pdfToRecipe(pdfContent).catch((e) => {
      Sentry.captureException(e, {
        extra: {
          url,
        },
      });
      console.error(e);
      return undefined;
    });

    if (!result) {
      metrics.clipError.inc({
        form: "url",
        method: "pdf",
      });

      return {
        recipe: {
          title: "Error",
          url: normalizedUrl,
        },
        labels: [],
        images: [],
      };
    }

    metrics.clipSuccess.inc({
      form: "url",
      method: "pdf",
    });

    result.recipe.url = normalizedUrl;

    if (isCompleteRecipe(result)) await cacheResult(result);

    return result;
  }

  if (response.headers.get("content-type")?.startsWith("image/")) {
    const imageContent = await response.buffer();
    const result = await ocrImagesToRecipe([imageContent]).catch((e) => {
      Sentry.captureException(e, {
        extra: {
          imageUrl: url,
        },
      });
      console.error(e);
      return undefined;
    });

    if (!result) {
      metrics.clipError.inc({
        form: "url",
        method: "image",
      });

      return {
        recipe: {
          title: "Error",
          url: normalizedUrl,
        },
        labels: [],
        images: [],
      };
    }

    metrics.clipSuccess.inc({
      form: "url",
      method: "image",
    });

    result.recipe.url = normalizedUrl;
    result.images.push(normalizedUrl);

    if (isCompleteRecipe(result)) await cacheResult(result);

    return result;
  }

  const htmlDocument = await response.text();

  const result = await clipHtml(htmlDocument, normalizedUrl, captureError);

  if (isCompleteRecipe(result) && !isBotChallengePage(htmlDocument)) {
    await cacheResult(result);
  }

  return result;
};

export const clipHtml = async (
  htmlDocument: string,
  url?: string,
  captureError?: (method: string, error: unknown) => void,
): Promise<StandardizedRecipeImportEntry> => {
  const form = url ? "url" : "html";

  if (!url) {
    metrics.clipRequested.inc({
      form,
    });
  }

  const defaultCaptureError = (method: string, error: unknown) => {
    metrics.clipError.inc({
      form,
      method,
    });
    console.error(error);
    Sentry.captureException(error, {
      extra: {
        url,
      },
    });
  };

  const onError = captureError ?? defaultCaptureError;

  const merge = (
    entries: StandardizedRecipeImportEntry[],
  ): StandardizedRecipeImportEntry => {
    if (entries.length === 0) {
      return {
        recipe: { title: "", url },
        images: [],
        labels: [],
      };
    }

    return entries.slice(1).reduce((acc, entry) => {
      return {
        recipe: {
          title: acc.recipe.title || entry.recipe.title,
          description: acc.recipe.description || entry.recipe.description,
          source: acc.recipe.source || entry.recipe.source,
          yield: acc.recipe.yield || entry.recipe.yield,
          activeTime: acc.recipe.activeTime || entry.recipe.activeTime,
          totalTime: acc.recipe.totalTime || entry.recipe.totalTime,
          ingredients: acc.recipe.ingredients || entry.recipe.ingredients,
          instructions: acc.recipe.instructions || entry.recipe.instructions,
          notes: acc.recipe.notes || entry.recipe.notes,
          nutritionInfo: acc.recipe.nutritionInfo || entry.recipe.nutritionInfo,
        },
        images: acc.images.length ? acc.images : entry.images,
        labels: acc.labels.length ? acc.labels : entry.labels,
      };
    }, entries[0]);
  };

  const attemptEach = async (
    methods: [
      string,
      () => Promise<StandardizedRecipeImportEntry | undefined>,
    ][],
  ): Promise<[string, StandardizedRecipeImportEntry]> => {
    const collectedResults: StandardizedRecipeImportEntry[] = [];

    for (const [name, fn] of methods) {
      try {
        const result = await fn();

        if (!result) continue;

        const usable = !!(
          result.recipe.ingredients && result.recipe.instructions
        );
        const grounded = isRecipeGrounded(result.recipe, getPageText().text);

        if (usable && grounded) {
          return [name, result];
        }

        if (name === "llm" && !grounded) {
          metrics.clipError.inc({
            form,
            method: "ungrounded",
          });
          Sentry.captureMessage("Clip LLM result rejected as ungrounded", {
            extra: {
              url,
            },
          });
          continue;
        }

        collectedResults.push(result);
      } catch (e) {
        onError(name, e);
      }
    }

    const merged = merge(collectedResults);

    const mergedComplete = !!(
      merged.recipe.ingredients && merged.recipe.instructions
    );

    if (collectedResults.length > 0 && !mergedComplete) {
      Sentry.captureMessage("Clip resulted in partial content", {
        extra: {
          url,
          collectedResults: JSON.stringify(collectedResults),
        },
      });
    }

    return ["merged", merged];
  };

  let pageText: PageText | undefined;
  const getPageText = (): PageText => {
    if (!pageText) pageText = extractPageText(htmlDocument);
    return pageText;
  };

  const structured = await extractStructuredData(htmlDocument, url).catch(
    (e) => {
      onError("structured-parse", e);
      return undefined;
    },
  );

  const [method, result] = await attemptEach([
    [
      "jsonld",
      async () =>
        structured
          ? clipRecipeViaStructuredData(
              structured,
              "jsonld",
              getPageText().text,
            )
          : undefined,
    ],
    [
      "microdata",
      async () =>
        structured
          ? clipRecipeViaStructuredData(
              structured,
              "microdata",
              getPageText().text,
            )
          : undefined,
    ],
    ["llm", () => clipRecipeHtmlWithLLM(htmlDocument, getPageText().text)],
  ]);

  if (result.images.length === 0) {
    const { ogImage } = getPageText();
    if (ogImage) result.images.push(ogImage);
  }

  if (hasUsableContent(result)) {
    metrics.clipSuccess.inc({
      form,
      method,
    });
  } else {
    metrics.clipError.inc({
      form,
      method: "empty",
    });
  }

  if (url) result.recipe.url = url;
  return result;
};

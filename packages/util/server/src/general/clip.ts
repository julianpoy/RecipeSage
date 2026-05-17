import { createHash } from "crypto";
import { AbortError } from "node-fetch";
import * as Sentry from "@sentry/node";
import he from "he";
import { Prisma, prisma } from "@recipesage/prisma";
import { fetchURL } from "./fetch";
import { StandardizedRecipeImportEntry } from "../db";
import { metrics } from "./metrics";
import {
  ocrImagesToRecipe,
  pdfToRecipe,
  textToRecipe,
  TextToRecipeInputType,
} from "../ml";
import {
  htmlToBodyInnerText,
  htmlToRecipeViaRecipeClipper,
} from "./clipHelpers";

const hashUrl = (url: string) => createHash("sha256").update(url).digest();

const isBotChallengePage = (html: string): boolean => {
  const lower = html.toLowerCase();
  return (
    lower.includes("<title>just a moment...</title>") ||
    lower.includes("<title>attention required!</title>") ||
    lower.includes("<title>access denied</title>")
  );
};

const clipRecipeHtmlWithJSDOM = async (document: string) => {
  if (isBotChallengePage(document)) return undefined;

  metrics.clipStartedProcessing.inc({
    method: "jsdom",
  });

  const result = await htmlToRecipeViaRecipeClipper(document);

  return {
    recipe: {
      title: he.decode(result?.title || ""),
      description: he.decode(result?.description || ""),
      source: he.decode(result?.source || ""),
      yield: he.decode(result?.yield || ""),
      activeTime: he.decode(result?.activeTime || ""),
      totalTime: he.decode(result?.totalTime || ""),
      ingredients: he.decode(result?.ingredients || ""),
      instructions: he.decode(result?.instructions || ""),
      notes: he.decode(result?.notes || ""),
      nutritionInfo: he.decode(result?.nutritionInfo || ""),
    },
    images: result?.imageURL ? [result.imageURL] : [],
    labels: [],
  } satisfies StandardizedRecipeImportEntry;
};

const clipRecipeHtmlWithGPT = async (document: string) => {
  if (isBotChallengePage(document)) return undefined;

  metrics.clipStartedProcessing.inc({
    method: "gpt",
  });

  const text = await htmlToBodyInnerText(document);

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

  const skipCache = url.includes("?") || url.includes("#");

  const urlHash = hashUrl(url);

  if (!skipCache) {
    const cached = await prisma.clipCache.findUnique({
      where: { urlHash },
    });

    if (cached && cached.url === url) {
      const cachedRecipe =
        cached.recipe as unknown as StandardizedRecipeImportEntry;
      if (
        cachedRecipe.recipe.title &&
        cachedRecipe.recipe.ingredients &&
        cachedRecipe.recipe.instructions
      ) {
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
  }

  metrics.clipCacheLookup.inc({
    result: "miss",
  });

  const response = await (async () => {
    const timeout = parseInt(
      process.env.CLIP_BROWSER_NAVIGATE_TIMEOUT || "10000",
    );

    let _url = url;
    if (process.env.SCRAPFLY_API_KEY) {
      const params = new URLSearchParams({
        asp: "true",
        key: process.env.SCRAPFLY_API_KEY,
        url,
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

  const cacheResult = async (result: StandardizedRecipeImportEntry) => {
    if (skipCache) return;
    await prisma.clipCache.upsert({
      where: { urlHash },
      create: {
        url,
        urlHash,
        recipe: result as unknown as Prisma.InputJsonValue,
      },
      update: {
        url,
        recipe: result as unknown as Prisma.InputJsonValue,
      },
    });
  };

  if (response.headers.get("content-type") === "application/pdf") {
    const pdfContent = await response.buffer();
    const result = await pdfToRecipe(pdfContent);

    if (!result) {
      metrics.clipError.inc({
        form: "url",
        method: "pdf",
      });

      return {
        recipe: {
          title: "Error",
          url,
        },
        labels: [],
        images: [],
      };
    }

    metrics.clipSuccess.inc({
      form: "url",
      method: "pdf",
    });

    result.recipe.url = url;

    await cacheResult(result);

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
          url,
        },
        labels: [],
        images: [],
      };
    }

    metrics.clipSuccess.inc({
      form: "url",
      method: "image",
    });

    result.recipe.url = url;
    result.images.push(url);

    await cacheResult(result);

    return result;
  }

  const htmlDocument = await response.text();

  const result = await clipHtml(htmlDocument, url, captureError);

  if (!isBotChallengePage(htmlDocument)) {
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

        if (result.recipe.ingredients && result.recipe.instructions) {
          return [name, result];
        }

        collectedResults.push(result);
      } catch (e) {
        onError(name, e);
      }
    }

    Sentry.captureMessage("Clip resulted in partial content", {
      extra: {
        url,
        collectedResults: JSON.stringify(collectedResults),
      },
    });

    return ["merged", merge(collectedResults)];
  };

  const [method, result] = await attemptEach([
    ["jsdom", () => clipRecipeHtmlWithJSDOM(htmlDocument)],
    ["gpt", () => clipRecipeHtmlWithGPT(htmlDocument)],
  ]);

  metrics.clipSuccess.inc({
    form,
    method,
  });

  if (url) result.recipe.url = url;
  return result;
};

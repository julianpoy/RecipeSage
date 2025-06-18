/* eslint-disable @typescript-eslint/no-explicit-any */

import { join } from "path";
import workerpool from "workerpool";
import fetch from "node-fetch";
import Sentry from "@sentry/node";
import he from "he";
import url from "url";
import { dedent } from "ts-dedent";
import puppeteer, { Browser } from "puppeteer-core";
import { fetchURL } from "./fetch";
import { StandardizedRecipeImportEntry } from "../db";
import { readFileSync } from "fs";
import { metrics } from "./metrics";
import { textToRecipe, TextToRecipeInputType } from "../ml";

const pool = workerpool.pool(join(__dirname, "./clipJsdomWorker.ts"), {
  workerType: "thread",
  workerThreadOpts: {
    execArgv: [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
    ],
  },
});

const INTERCEPT_PLACEHOLDER_URL = "https://example.com/intercept-me";

const recipeClipperUMD = readFileSync(
  "./node_modules/@julianpoy/recipe-clipper/dist/recipe-clipper.umd.js",
  "utf-8",
);

const disconnectPuppeteer = async (browser: Browser) => {
  try {
    await browser.disconnect();
  } catch (e) {
    Sentry.captureException(e);
  }
};

const clipRecipeUrlWithPuppeteer = async (
  clipUrl: string,
): Promise<StandardizedRecipeImportEntry | undefined> => {
  let browser;
  try {
    if (
      !process.env.BROWSERLESS_HOST ||
      !process.env.BROWSERLESS_PORT ||
      !process.env.BROWSERLESS_TOKEN
    ) {
      console.warn(
        "BROWSERLESS_HOST, BROWSERLESS_PORT, and BROWSERLESS_TOKEN must be defined in environment variables to enable browserless",
      );

      return;
    }

    metrics.clipStartedProcessing.inc({
      method: "puppeteer",
    });

    const browserWSEndpoint = new URL(
      `ws://${process.env.BROWSERLESS_HOST}:${process.env.BROWSERLESS_PORT}`,
    );
    browserWSEndpoint.searchParams.append(
      "token",
      process.env.BROWSERLESS_TOKEN,
    );
    browserWSEndpoint.searchParams.append("blockAds", "true");

    const chromeLaunchArgs = ["--disable-web-security"];

    if (process.env.CLIP_PROXY_URL) {
      const proxyUrl = url.parse(process.env.CLIP_PROXY_URL);
      chromeLaunchArgs.push(`--proxy-server="https=${proxyUrl.host}"`);
    }

    const launchArgs = JSON.stringify({
      stealth: true,
      args: chromeLaunchArgs,
    });
    browserWSEndpoint.searchParams.append("launch", launchArgs);

    browserWSEndpoint.searchParams.append(
      "timeout",
      process.env.CLIP_BROWSER_TIMEOUT || "15000",
    );

    const browser = await puppeteer.connect({
      browserWSEndpoint: browserWSEndpoint.href,
    });

    const page = await browser.newPage();

    if (process.env.CLIP_PROXY_USERNAME && process.env.CLIP_PROXY_PASSWORD) {
      await page.authenticate({
        username: process.env.CLIP_PROXY_USERNAME,
        password: process.env.CLIP_PROXY_PASSWORD,
      });
    }

    await page.setBypassCSP(true);

    await page.setRequestInterception(true);
    page.on("request", async (interceptedRequest) => {
      if (interceptedRequest.url() === INTERCEPT_PLACEHOLDER_URL) {
        try {
          const ingredientInstructionClassifierUrl =
            process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL;
          if (!ingredientInstructionClassifierUrl)
            throw new Error(
              "INGREDIENT_INSTRUCTION_CLASSIFIER_URL not set in env",
            );

          const response = await fetch(ingredientInstructionClassifierUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: interceptedRequest.postData(),
          });

          const text = await response.text();

          interceptedRequest.respond({
            contentType: "application/json",
            body: text,
          });
        } catch (e) {
          console.log("Error while classifying", e);
          interceptedRequest.abort();
        }
      } else {
        interceptedRequest.continue();
      }
    });

    await page.goto(clipUrl, {
      waitUntil: "load",
    });

    try {
      await page.waitForNetworkIdle({
        concurrency: 2,
        timeout: parseInt(process.env.CLIP_BROWSER_NAVIGATE_TIMEOUT || "6000"),
      });
    } catch (err) {
      console.error("Page did not enter idle state, proceeding anyway.", err);
    }

    await page.evaluate(dedent`() => {
      try {
        // Force lazyload for content listening to scroll
        window.scrollTo(0, document.body.scrollHeight);
      } catch(e) {}

      try {
        // Fix UMD for sites that define reserved names globally
        window.define = null;
        window.exports = null;
      } catch(e) {}
    }`);

    await page.addScriptTag({
      content: recipeClipperUMD,
    });
    const result = await page.evaluate((interceptUrl) => {
      return (window as any).RecipeClipper.clipRecipe({
        mlClassifyEndpoint: interceptUrl,
        ignoreMLClassifyErrors: true,
      });
    }, INTERCEPT_PLACEHOLDER_URL);

    disconnectPuppeteer(browser);

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
      },
      images: result?.imageURL ? [result.imageURL] : [],
      labels: [],
    } satisfies StandardizedRecipeImportEntry;
  } catch (e) {
    if (browser) disconnectPuppeteer(browser);

    throw e;
  }
};

const clipRecipeHtmlWithJSDOM = async (document: string) => {
  metrics.clipStartedProcessing.inc({
    method: "jsdom",
  });

  // We exec with pool because jsdom is blocking and can be slow for large pages
  const result = await pool.exec("clipRecipeHtmlWithJSDOM", [document]);

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
    },
    images: result?.imageURL ? [result.imageURL] : [],
    labels: [],
  } satisfies StandardizedRecipeImportEntry;
};

const clipRecipeHtmlWithGPT = async (document: string) => {
  metrics.clipStartedProcessing.inc({
    method: "gpt",
  });

  // We exec with pool because jsdom is blocking and can be slow for large pages
  const text = await pool.exec("htmlToBodyInnerText", [document]);

  return textToRecipe(text, TextToRecipeInputType.Webpage);
};

export const clipUrl = async (
  url: string,
): Promise<StandardizedRecipeImportEntry> => {
  metrics.clipRequested.inc({
    form: "url",
  });

  const response = await fetchURL(url, {
    requestConfig: {
      timeout: parseInt(process.env.CLIP_BROWSER_NAVIGATE_TIMEOUT || "6000"),
    },
  });

  const htmlDocument = await response.text();

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

  const merge = (entries: StandardizedRecipeImportEntry[]) => {
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
        captureError(name, e);
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

  const result = await attemptEach([
    ["puppeteer", () => clipRecipeUrlWithPuppeteer(url)],
    ["jsdom", () => clipRecipeHtmlWithJSDOM(htmlDocument)],
    ["gpt", () => clipRecipeHtmlWithGPT(htmlDocument)],
  ]);

  metrics.clipSuccess.inc({
    form: "url",
    method: result[0],
  });

  result[1].recipe.url = url;

  return result[1];
};

export const clipHtml = async (
  document: string,
): Promise<StandardizedRecipeImportEntry | undefined> => {
  metrics.clipRequested.inc({
    form: "html",
  });

  const results = await clipRecipeHtmlWithJSDOM(document).catch((e) => {
    metrics.clipError.inc({
      form: "html",
      method: "jsdom",
    });
    console.error(e);
    Sentry.captureException(e);
  });

  return {
    recipe: {
      title: results?.recipe.title || "",
      description: results?.recipe.description || "",
      source: results?.recipe.source || "",
      yield: results?.recipe.yield || "",
      activeTime: results?.recipe.activeTime || "",
      totalTime: results?.recipe.totalTime || "",
      ingredients: results?.recipe.ingredients || "",
      instructions: results?.recipe.instructions || "",
      notes: results?.recipe.notes || "",
    },
    images: results?.images || [],
    labels: results?.labels || [],
  } satisfies StandardizedRecipeImportEntry;
};

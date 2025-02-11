/* eslint-disable @typescript-eslint/no-explicit-any */

import { join } from "path";
import * as workerpool from "workerpool";
import fetch from "node-fetch";
import * as Sentry from "@sentry/node";
import * as he from "he";
import * as url from "url";
import { dedent } from "ts-dedent";
import puppeteer, { Browser } from "puppeteer-core";
import { fetchURL } from "./fetch";
import { StandardizedRecipeImportEntry } from "../db";
import { readFileSync } from "fs";

const pool = workerpool.pool(join(__dirname, "./clipJsdomWorker.ts"), {
  workerType: "thread",
  workerThreadOpts: {
    execArgv: [
      "--require",
      "ts-node/register",
      "-r",
      "tsconfig-paths/register",
    ],
  },
});

const INTERCEPT_PLACEHOLDER_URL = "https://example.com/intercept-me";

const recipeClipperUMD = readFileSync(
  "./node_modules/@julianpoy/recipe-clipper/dist/recipe-clipper.umd.js",
  "utf-8",
);

interface RecipeClipperResult {
  imageURL: string | undefined;
  title: string | undefined;
  description: string | undefined;
  source: string | undefined;
  yield: string | undefined;
  activeTime: string | undefined;
  totalTime: string | undefined;
  ingredients: string | undefined;
  instructions: string | undefined;
  notes: string | undefined;
}

const disconnectPuppeteer = async (browser: Browser) => {
  try {
    await browser.disconnect();
  } catch (e) {
    Sentry.captureException(e);
  }
};

const clipRecipeUrlWithPuppeteer = async (clipUrl: string) => {
  let browser;
  try {
    if (
      !process.env.BROWSERLESS_HOST ||
      !process.env.BROWSERLESS_PORT ||
      !process.env.BROWSERLESS_TOKEN
    ) {
      throw new Error(
        "BROWSERLESS_HOST, BROWSERLESS_PORT, and BROWSERLESS_TOKEN must be defined in environment variables to enable browserless",
      );
    }

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

    await page.goto(clipUrl);

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
    const recipeData = await page.evaluate((interceptUrl) => {
      return (window as any).RecipeClipper.clipRecipe({
        mlClassifyEndpoint: interceptUrl,
        ignoreMLClassifyErrors: true,
      });
    }, INTERCEPT_PLACEHOLDER_URL);

    disconnectPuppeteer(browser);

    return recipeData;
  } catch (e) {
    if (browser) disconnectPuppeteer(browser);

    throw e;
  }
};

const clipRecipeHtmlWithJSDOM = async (document: string) => {
  // We exec with pool because jsdom is blocking and can be slow for large pages
  return pool.exec("clipRecipeHtmlWithJSDOM", [document]);
};

const clipRecipeUrlWithJSDOM = async (clipUrl: string) => {
  const response = await fetchURL(clipUrl, {
    requestConfig: {
      timeout: parseInt(process.env.CLIP_BROWSER_NAVIGATE_TIMEOUT || "6000"),
    },
  });

  const document = await response.text();

  return await clipRecipeHtmlWithJSDOM(document);
};

export const clipUrl = async (
  url: string,
): Promise<StandardizedRecipeImportEntry> => {
  const recipeDataBrowser = await clipRecipeUrlWithPuppeteer(url).catch((e) => {
    console.error(e);
    Sentry.captureException(e, {
      extra: {
        url,
      },
    });
  });

  let results = recipeDataBrowser || {};
  if (
    !recipeDataBrowser ||
    !recipeDataBrowser.ingredients ||
    !recipeDataBrowser.instructions
  ) {
    const recipeDataJSDOM = await clipRecipeUrlWithJSDOM(url).catch((e) => {
      console.error(e);
      Sentry.captureException(e, {
        extra: {
          url,
        },
      });
    });

    Sentry.captureMessage("Fell back to JSDOM", {
      extra: {
        url,
      },
    });

    if (recipeDataJSDOM) {
      results = recipeDataJSDOM;

      if (recipeDataBrowser) {
        // Merge results (browser overrides JSDOM due to accuracy)
        Object.entries(recipeDataBrowser as RecipeClipperResult).forEach(
          ([key, value]) => {
            if (value?.trim()) results[key] = value;
          },
        );
      }
    }
  }

  // Decode all html entities from fields
  Object.entries(results).forEach((entry) => {
    results[entry[0]] = he.decode(entry[1] as any);
  });

  const typedResults = results as RecipeClipperResult;

  return {
    recipe: {
      title: typedResults.title || "",
      description: typedResults.description || "",
      source: typedResults.source || "",
      yield: typedResults.yield || "",
      activeTime: typedResults.activeTime || "",
      totalTime: typedResults.totalTime || "",
      ingredients: typedResults.ingredients || "",
      instructions: typedResults.instructions || "",
      notes: typedResults.notes || "",
    },
    images: typedResults.imageURL ? [typedResults.imageURL] : [],
    labels: [],
  } satisfies StandardizedRecipeImportEntry;
};

export const clipHtml = async (
  document: string,
): Promise<StandardizedRecipeImportEntry> => {
  const results = await clipRecipeHtmlWithJSDOM(document).catch((e) => {
    console.error(e);
    Sentry.captureException(e);
  });

  // Decode all html entities from fields
  Object.entries(results).forEach((entry) => {
    results[entry[0]] = he.decode(entry[1] as any);
  });

  const typedResults = results as RecipeClipperResult;

  return {
    recipe: {
      title: typedResults.title || "",
      description: typedResults.description || "",
      source: typedResults.source || "",
      yield: typedResults.yield || "",
      activeTime: typedResults.activeTime || "",
      totalTime: typedResults.totalTime || "",
      ingredients: typedResults.ingredients || "",
      instructions: typedResults.instructions || "",
      notes: typedResults.notes || "",
    },
    images: typedResults.imageURL ? [typedResults.imageURL] : [],
    labels: [],
  } satisfies StandardizedRecipeImportEntry;
};

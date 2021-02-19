const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const puppeteer = require('puppeteer-core');

const jsdom = require("jsdom");
const RecipeClipper = require('@julianpoy/recipe-clipper');

const loggerService = require('../services/logger');

const INTERCEPT_PLACEHOLDER_URL = "https://example.com/intercept-me";

const disconnectPuppeteer = (browser) => {
  try {
    browser.disconnect();
  } catch(e) {
    loggerService.capture("Error while disconnecting from browserless", {
      level: 'warning',
      data: {
        error: e
      }
    });
  }
};

const clipRecipe = async clipUrl => {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: `ws://${process.env.BROWSERLESS_HOST}:${process.env.BROWSERLESS_PORT}?stealth&blockAds&--disable-web-security`
    });

    const page = await browser.newPage();

    await page.setBypassCSP(true);

    await page.setRequestInterception(true);
    page.on('request', async interceptedRequest => {
      if (interceptedRequest.url() === INTERCEPT_PLACEHOLDER_URL) {
        try {
          const response = await fetch(process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: interceptedRequest.postData(),
          });

          const text = await response.text();

          interceptedRequest.respond({
            content: 'application/json',
            body: text
          });
        } catch(e) {
          console.log("Error while classifying", e);
          request.abort();
        }
      } else {
        interceptedRequest.continue();
      }
    });

    try {
      await page.goto(clipUrl, {
        waitUntil: "networkidle2",
        timeout: 25000
      });
    } catch(err) {
      err.status = 400;
      loggerService.capture("Clip failed", {
        level: 'warning',
        err,
        data: {
          clipUrl
        }
      });
      throw err;
    }

    await page.evaluate(`() => {
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

    await page.addScriptTag({ path: './node_modules/@julianpoy/recipe-clipper/dist/recipe-clipper.umd.js' });
    const recipeData = await page.evaluate((interceptUrl) => {
      return window.RecipeClipper.clipRecipe({
        mlClassifyEndpoint: interceptUrl,
      });
    }, INTERCEPT_PLACEHOLDER_URL);

    loggerService.capture("Clip success", {
      level: 'info',
      data: {
        recipeData,
        clipUrl
      }
    });

    disconnectPuppeteer(browser);

    return recipeData;
  } catch (e) {
    disconnectPuppeteer(browser);

    throw e;
  }
};

const clipRecipeJSDOM = async url => {
  const response = await fetch(url);

  const document = await response.text();

  const dom = new jsdom.JSDOM(document);

  const { window } = dom;

  window.fetch = fetch;

  return await RecipeClipper.clipRecipe({
    window,
    mlClassifyEndpoint: process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL,
  });
};

router.get('/', async (req, res, next) => {
  try {
    const url = (req.query.url || "").trim();
    if (!url) {
      return res.status(400).send("Must provide a URL");
    }

    let recipeData;
    try {
      recipeData = await clipRecipe(url);
    } catch(e) {
      recipeData = await clipRecipeJSDOM(url);
    }

    res.status(200).json(recipeData);
  } catch(e) {
    next(e);
  }
});

module.exports = router;


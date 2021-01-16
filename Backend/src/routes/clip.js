const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const puppeteer = require('puppeteer-core');

const RecipeClipper = require('@julianpoy/recipe-clipper');

const loggerService = require('../services/logger');

const INTERCEPT_PLACEHOLDER_URL = "https://example.com/intercept-me";

const clipRecipe = async clipUrl => {
  const browser = await puppeteer.connect({
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
    console.log("Timed out", err);
    loggerService.capture("Clip failed", {
      level: 'warning',
      err,
      data: {
        clipUrl
      }
    });
    err.status = 400;
    throw err;
  }

  await page.evaluate(`() => {
    try {
      // Force lazyload for content listening to scroll
      window.scrollTo(0, document.body.scrollHeight);
      // Fix UMD for sites that define reserved names globally
      window.define = null;
      window.exports = null;
    } catch(e) {}
  }`);

  await page.addScriptTag({ path: './node_modules/@julianpoy/recipe-clipper/dist/recipe-clipper.umd.js' });
  const recipeData = await page.evaluate((interceptUrl) => {
    window.RC_ML_CLASSIFY_ENDPOINT = interceptUrl;
    return window.RecipeClipper.clipRecipe();
  }, INTERCEPT_PLACEHOLDER_URL);

  console.log(JSON.stringify(recipeData));

  loggerService.capture("Clip success", {
    level: 'info',
    data: {
      recipeData,
      clipUrl
    }
  });
  return recipeData;
};

router.get('/', async (req, res, next) => {
  try {
    const url = (req.query.url || "").trim();
    if (!url) {
      return res.status(400).send("Must provide a URL");
    }

    const recipeData = await clipRecipe(url);

    res.status(200).json(recipeData);
  } catch(e) {
    next(e);
  }
});

module.exports = router;


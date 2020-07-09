const express = require('express');
const router = express.Router();

const puppeteer = require('puppeteer-core');

const RecipeClipper = require('@julianpoy/recipe-clipper');

const clipRecipe = async clipUrl => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://${process.env.BROWSERLESS_HOST}:${process.env.BROWSERLESS_PORT}`
  });

  const page = await browser.newPage();

  await page.setBypassCSP(true);

  try {
    await page.goto(clipUrl, {
      waitUntil: "networkidle2",
      timeout: 25000
    });
  } catch(err) {
    console.log("Timed out", err);
    err.status = 400;
    throw err;
  }

  await page.evaluate(() => {
    try {
      // Force lazyload for content listening to scroll
      window.scrollTo(0, document.body.scrollHeight);
      // Fix UMD for sites that define reserved names globally
      window.define = null;
      window.exports = null;
    } catch(e) {}
  });

  await page.addScriptTag({ path: './node_modules/@julianpoy/recipe-clipper/dist/recipe-clipper.umd.js' });
  const recipeData = await page.evaluate(() => {
    return window.RecipeClipper.clipRecipe();
  });

  console.log(JSON.stringify(recipeData));
  return recipeData;
};

router.get('/', async (req, res, next) => {
  try {
    const recipeData = await clipRecipe(req.query.url);

    res.status(200).json(recipeData);
  } catch(e) {
    next(e);
  }
});

module.exports = router;


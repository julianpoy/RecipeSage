import "./services/sentry-init";
import * as Sentry from "@sentry/node";
import { program } from "commander";

import { indexRecipes } from "./services/search";

import { prisma } from "@recipesage/prisma";

program
  .option("-b, --batch-size [size]", "Batch size", "1000")
  .option("-i, --batch-interval [interval]", "Batch interval in seconds", "1")
  .parse(process.argv);
const opts = program.opts();
const options = {
  batchSize: parseInt(opts.batchSize, 10),
  batchInterval: parseFloat(opts.batchInterval),
};

const runIndexOp = async () => {
  try {
    let lt = new Date();
    lt.setDate(lt.getDate() - 7);

    if (process.env.INDEX_BEFORE) {
      lt = new Date(process.env.INDEX_BEFORE); // Must be in '2020-03-01 22:20' format
    }

    const recipes = await prisma.recipe.findMany({
      where: {
        OR: [
          {
            indexedAt: null,
          },
          {
            indexedAt: {
              lt,
            },
          },
        ],
      },
      take: options.batchSize,
    });

    if (!recipes || recipes.length === 0) {
      clearInterval(runInterval);
      console.log("Index complete!");
      process.exit(0);
    }

    await indexRecipes(recipes);

    const ids = recipes.map((r) => r.id);
    await prisma.recipe.updateMany({
      data: {
        indexedAt: new Date(),
      },
      where: {
        id: {
          in: ids,
        },
      },
    });
  } catch (e) {
    clearInterval(runInterval);
    Sentry.captureException(e);
    console.log("Error while indexing", e);
    process.exit(1);
  }
};

const runInterval = setInterval(runIndexOp, options.batchInterval * 1000);

process.on("SIGTERM", () => {
  console.log("RECEIVED SIGTERM - STOPPING JOB");
  process.exit(0);
});

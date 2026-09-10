import "./sentry-init.js";
import { program } from "commander";

import { activateBonusFeatures } from "./activateBonusFeatures";
import { categorizeShoppingListItems } from "./categorizeShoppingListItems";
import { decryptDebugStore } from "./decryptDebugStore";
import { indexRecipes } from "./indexRecipes";
import { recomputeDiscoverRankScores } from "./recomputeDiscoverRankScores";
import { remoderateStuckDiscoverRecipes } from "./remoderateStuckDiscoverRecipes";
import { seed } from "./seeders/seed";

const runAction =
  <O>(fn: (options: O) => Promise<void>) =>
  async (options: O) => {
    try {
      await fn(options);
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  };

program.name("recipesage").description("RecipeSage CLI");

program
  .command("indexRecipes")
  .description("Backfill the Postgres full-text search tsv columns.")
  .option("-b, --batch-size <size>", "Batch size", "1000")
  .option("-i, --batch-interval <interval>", "Batch interval in seconds", "1")
  .action(
    runAction<{ batchSize: string; batchInterval: string }>(async (options) => {
      await indexRecipes({
        batchSize: parseInt(options.batchSize, 10),
        batchInterval: parseFloat(options.batchInterval),
      });
    }),
  );

program
  .command("categorizeShoppingListItems")
  .description("Categorize uncategorized shopping list items.")
  .action(
    runAction(async () => {
      await categorizeShoppingListItems();
    }),
  );

program
  .command("recomputeDiscoverRankScores")
  .description(
    "Recompute the smart-ranking score for every discover recipe. Intended to be scheduled (for example, as a Kubernetes CronJob).",
  )
  .option("-b, --batch-size <size>", "Batch size", "1000")
  .action(
    runAction<{ batchSize: string }>(async (options) => {
      await recomputeDiscoverRankScores({
        batchSize: parseInt(options.batchSize, 10),
      });
    }),
  );

program
  .command("remoderateStuckDiscoverRecipes")
  .description("Re-queue moderation for discover recipes stuck in PENDING.")
  .option("-a, --min-age-minutes <minutes>", "Minimum age in minutes", "30")
  .option("-b, --batch-size <size>", "Batch size", "100")
  .option("--dry-run", "List the recipes without enqueuing anything", false)
  .action(
    runAction<{ minAgeMinutes: string; batchSize: string; dryRun: boolean }>(
      async (options) => {
        await remoderateStuckDiscoverRecipes({
          minAgeMinutes: parseInt(options.minAgeMinutes, 10),
          batchSize: parseInt(options.batchSize, 10),
          dryRun: options.dryRun,
        });
      },
    ),
  );

program
  .command("activateBonusFeatures")
  .description(
    "Activate bonus features (a subscription) for a user by email address.",
  )
  .requiredOption("--email <email>", "The user's email address")
  .option(
    "--subscription-name <name>",
    "Subscription model name (forever, pyo-monthly, pyo-yearly, pyo-single)",
    "forever",
  )
  .action(
    runAction<{ email: string; subscriptionName: string }>(async (options) => {
      await activateBonusFeatures({
        email: options.email,
        subscriptionName: options.subscriptionName,
      });
    }),
  );

program
  .command("seed")
  .description(
    "Seed baseline database records (the assistant user and the shared example recipe images).",
  )
  .action(
    runAction(async () => {
      await seed();
    }),
  );

program
  .command("decryptDebugStore")
  .description("Decrypt an encrypted debug store dump.")
  .requiredOption("--input <input>", "Input filename")
  .requiredOption("--output <output>", "Output filename")
  .action(
    runAction<{ input: string; output: string }>(async (options) => {
      await decryptDebugStore({
        input: options.input,
        output: options.output,
      });
    }),
  );

const close = (signal: string) => {
  console.log(`RECEIVED ${signal} - STOPPING JOB`);
  process.exit(0);
};

process.on("SIGTERM", () => close("SIGTERM"));
process.on("SIGINT", () => close("SIGINT"));

program.parseAsync(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});

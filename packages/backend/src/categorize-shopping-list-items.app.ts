import "./services/sentry-init";
import * as Sentry from "@sentry/node";
import { program } from "commander";

import { prisma } from "@recipesage/prisma";
import { getShoppingListItemCategories } from "@recipesage/util/server/general";

program.parse(process.argv);

const waitFor = async (timeout: number) => {
  new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

const run = async () => {
  try {
    while (true) {
      const items = await prisma.shoppingListItem.findMany({
        where: {
          categoryTitle: null,
        },
        select: {
          id: true,
          title: true,
        },
        take: 40,
      });

      if (!items.length) {
        console.log("Categorization complete!");
        process.exit(0);
      }

      const categoryTitles = await getShoppingListItemCategories(
        items.map((el) => el.title),
      );

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const categoryTitle = `::${categoryTitles[i]}`;

        await prisma.shoppingListItem.update({
          where: {
            id: item.id,
          },
          data: {
            categoryTitle,
          },
        });
        await waitFor(100);
      }
    }
  } catch (e) {
    Sentry.captureException(e);
    console.log("Error while processing", e);
    process.exit(1);
  }
};
run();

process.on("SIGTERM", () => {
  console.log("RECEIVED SIGTERM - STOPPING JOB");
  process.exit(0);
});

import {
  prisma,
  ShoppingListItemSummary,
  shoppingListSummaryWithItems,
} from "@recipesage/prisma";
import { z } from "zod";
import {
  getAccessToShoppingList,
  ShoppingListAccessLevel,
} from "@recipesage/util/server/db";
import { NotFoundError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import {
  getShoppingListItemGroupTitles,
  translate,
} from "@recipesage/util/server/general";
import {
  getShoppingListItemGroupings,
  ShoppingListSortOptions,
} from "@recipesage/util/shared";

const schema = {
  query: z.object({
    version: z.string(),
    groupCategories: z.string(),
    groupSimilar: z.string(),
    sortBy: z.nativeEnum(ShoppingListSortOptions).optional(),
    preferredLanguage: z.string().optional(),
  }),
  params: z.object({
    shoppingListId: z.string(),
  }),
};

export const printShoppingListHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const shoppingList = await prisma.shoppingList.findUnique({
      where: {
        id: req.params.shoppingListId,
      },
      ...shoppingListSummaryWithItems,
    });

    const access = await getAccessToShoppingList(
      res.locals.session.userId,
      req.params.shoppingListId,
    );

    if (!shoppingList || access.level === ShoppingListAccessLevel.None) {
      throw new NotFoundError(
        "Shopping list not found or you do not have access",
      );
    }

    const itemSummaries = getShoppingListItemGroupTitles(
      shoppingList.items,
    ) satisfies ShoppingListItemSummary[];

    const languageHeader =
      req.query.preferredLanguage || req.headers["accept-language"] || "en-us";
    const categoryTitlesToi18n: Record<string, string> = {
      uncategorized: await translate(
        languageHeader,
        "pages.shoppingList.category.uncategorized",
      ),
      produce: await translate(
        languageHeader,
        "pages.shoppingList.category.produce",
      ),
      dairy: await translate(
        languageHeader,
        "pages.shoppingList.category.dairy",
      ),
      meat: await translate(languageHeader, "pages.shoppingList.category.meat"),
      bakery: await translate(
        languageHeader,
        "pages.shoppingList.category.bakery",
      ),
      grocery: await translate(
        languageHeader,
        "pages.shoppingList.category.grocery",
      ),
      liquor: await translate(
        languageHeader,
        "pages.shoppingList.category.liquor",
      ),
      seafood: await translate(
        languageHeader,
        "pages.shoppingList.category.seafood",
      ),
      nonfood: await translate(
        languageHeader,
        "pages.shoppingList.category.nonfood",
      ),
      frozen: await translate(
        languageHeader,
        "pages.shoppingList.category.frozen",
      ),
      canned: await translate(
        languageHeader,
        "pages.shoppingList.category.canned",
      ),
      beverages: await translate(
        languageHeader,
        "pages.shoppingList.category.beverages",
      ),
    };

    const itemSummariesTranslated = itemSummaries.map((el) => {
      const categoryTitle = el.categoryTitle || "::uncategorized";
      if (categoryTitle.startsWith("::")) {
        const key = categoryTitlesToi18n[categoryTitle.substring(2)];
        return {
          ...el,
          categoryTitle:
            categoryTitlesToi18n[key] || categoryTitlesToi18n.uncategorized,
        };
      }
      return el;
    });

    const {
      items,
      groupTitles,
      categoryTitles,
      itemsByGroupTitle,
      itemsByCategoryTitle,
      groupsByCategoryTitle,
    } = getShoppingListItemGroupings(
      itemSummariesTranslated,
      req.query.sortBy || ShoppingListSortOptions.TitleDesc,
      categoryTitlesToi18n.uncategorized,
    );

    res.render("shoppinglist-default", {
      title: shoppingList.title,
      items,
      groupTitles,
      categoryTitles,
      itemsByGroupTitle,
      itemsByCategoryTitle,
      groupsByCategoryTitle,
      date: new Date().toDateString(),
      modifiers: {
        groupCategories: req.query.groupCategories === "true",
        groupSimilar: req.query.groupSimilar === "true",
      },
    });
  },
);

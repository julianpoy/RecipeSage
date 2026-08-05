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
  formatDateUTC,
  formatDateUTCLocalized,
  getRequestLanguage,
  getShoppingListItemGroupTitles,
  translate,
} from "@recipesage/util/server/general";
import {
  getLanguageDirection,
  getShoppingListItemGroupings,
  ShoppingListSortOptions,
} from "@recipesage/util/shared";

const schema = {
  query: z.object({
    version: z.string(),
    groupCategories: z.string().optional(),
    groupSimilar: z.string().optional(),
    sortBy: z.enum(ShoppingListSortOptions).optional(),
    preferredLanguage: z.string().optional(),
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
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

    const language = getRequestLanguage(req);

    const itemSummaries = getShoppingListItemGroupTitles(
      shoppingList.items,
      language,
    ) satisfies ShoppingListItemSummary[];
    const categoryTitlesToi18n: Record<string, string> = {
      uncategorized: await translate(
        language,
        "pages.shoppingList.category.uncategorized",
      ),
      produce: await translate(language, "pages.shoppingList.category.produce"),
      dairy: await translate(language, "pages.shoppingList.category.dairy"),
      meat: await translate(language, "pages.shoppingList.category.meat"),
      bakery: await translate(language, "pages.shoppingList.category.bakery"),
      grocery: await translate(language, "pages.shoppingList.category.grocery"),
      liquor: await translate(language, "pages.shoppingList.category.liquor"),
      seafood: await translate(language, "pages.shoppingList.category.seafood"),
      nonfood: await translate(language, "pages.shoppingList.category.nonfood"),
      frozen: await translate(language, "pages.shoppingList.category.frozen"),
      canned: await translate(language, "pages.shoppingList.category.canned"),
      beverages: await translate(
        language,
        "pages.shoppingList.category.beverages",
      ),
      baking: await translate(language, "pages.shoppingList.category.baking"),
      spices: await translate(language, "pages.shoppingList.category.spices"),
      condiments: await translate(
        language,
        "pages.shoppingList.category.condiments",
      ),
    };

    const itemSummariesTranslated = itemSummaries.map((el) => {
      const categoryTitle = el.categoryTitle || "::uncategorized";
      if (categoryTitle.startsWith("::")) {
        const translatedTitle =
          categoryTitlesToi18n[categoryTitle.substring(2)];
        return {
          ...el,
          categoryTitle: translatedTitle || categoryTitlesToi18n.uncategorized,
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
      shoppingList.categoryOrder,
    );

    res.render("shoppinglist-default", {
      title: shoppingList.title,
      items,
      groupTitles,
      categoryTitles,
      itemsByGroupTitle,
      itemsByCategoryTitle,
      groupsByCategoryTitle,
      printedOn: await translate(language, "generic.printedOn", {
        date: formatDateUTCLocalized(
          req.query.today || formatDateUTC(new Date()),
          language,
        ),
      }),
      language,
      direction: getLanguageDirection(language),
      modifiers: {
        groupCategories: req.query.groupCategories === "true",
        groupSimilar: req.query.groupSimilar === "true",
      },
    });
  },
);

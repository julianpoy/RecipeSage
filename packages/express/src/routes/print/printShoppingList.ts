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
  SHOPPING_LIST_CATEGORY_I18N,
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
    const categoryTitlesToi18n: Record<string, string> = Object.fromEntries(
      await Promise.all(
        Object.entries(SHOPPING_LIST_CATEGORY_I18N).map(
          async ([categoryTitle, i18nKey]) => [
            categoryTitle,
            await translate(language, i18nKey),
          ],
        ),
      ),
    );

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

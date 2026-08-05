import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import bodyParser from "body-parser";
import request from "supertest";

const shoppingListFindUniqueMock = vi.fn();
const getAccessToShoppingListMock = vi.fn();

vi.mock("@recipesage/prisma", () => ({
  prisma: {
    shoppingList: {
      findUnique: (...args: unknown[]) => shoppingListFindUniqueMock(...args),
    },
  },
  shoppingListSummaryWithItems: {},
}));

vi.mock("@recipesage/util/server/db", () => ({
  getAccessToShoppingList: (...args: unknown[]) =>
    getAccessToShoppingListMock(...args),
  ShoppingListAccessLevel: {
    None: "none",
    Read: "read",
    Write: "write",
  },
}));

vi.mock("@recipesage/util/server/general", () => ({
  validateSession: vi.fn(async () => ({
    id: "session-id",
    userId: "user-id",
  })),
  extendSession: vi.fn(),
  RateLimitTier: {},
  getRequestLanguage: () => "en-us",
  formatDateUTC: () => "2026-08-05",
  formatDateUTCLocalized: () => "August 5, 2026",
  getShoppingListItemGroupTitles: (items: { title: string }[]) =>
    items.map((item) => ({ ...item, groupTitle: item.title })),
  translate: async (_language: string, key: string) => {
    const translations: Record<string, string> = {
      "pages.shoppingList.category.uncategorized": "Uncategorized",
      "pages.shoppingList.category.produce": "Produce",
      "pages.shoppingList.category.dairy": "Dairy",
      "pages.shoppingList.category.meat": "Meat",
      "pages.shoppingList.category.bakery": "Bakery",
      "pages.shoppingList.category.grocery": "Grocery",
      "pages.shoppingList.category.liquor": "Liquor",
      "pages.shoppingList.category.seafood": "Seafood",
      "pages.shoppingList.category.nonfood": "Non food",
      "pages.shoppingList.category.frozen": "Frozen",
      "pages.shoppingList.category.canned": "Canned",
      "pages.shoppingList.category.beverages": "Beverages",
      "pages.shoppingList.category.baking": "Baking",
      "pages.shoppingList.category.spices": "Spices",
      "pages.shoppingList.category.condiments": "Condiments",
      "generic.printedOn": "Printed on",
    };
    return translations[key] ?? key;
  },
}));

const renderedLocals: Record<string, unknown>[] = [];

const buildApp = async () => {
  const { printRouter } = await import("./index");
  const app = express();
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    res.render = ((_view: string, locals: Record<string, unknown>) => {
      renderedLocals.push(locals);
      res.status(200).send("ok");
    }) as typeof res.render;
    next();
  });
  app.use("/print", printRouter);
  return app;
};

const item = (title: string, categoryTitle: string) => ({
  id: `id-${title}`,
  title,
  categoryTitle,
  completed: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  recipe: null,
  mealPlanItem: null,
  user: { id: "user-id", name: "Tester", handle: null },
});

describe("GET /print/shoppingList/:shoppingListId", () => {
  beforeEach(() => {
    renderedLocals.length = 0;
    shoppingListFindUniqueMock.mockReset();
    getAccessToShoppingListMock.mockReset();
    getAccessToShoppingListMock.mockResolvedValue({ level: "write" });
  });

  it("translates every built in category, including the newer ones", async () => {
    shoppingListFindUniqueMock.mockResolvedValue({
      id: "list-id",
      title: "Groceries",
      categoryOrder: null,
      items: [
        item("Flour", "::baking"),
        item("Cumin", "::spices"),
        item("Ketchup", "::condiments"),
        item("Apples", "::produce"),
      ],
    });

    const app = await buildApp();
    const response = await request(app)
      .get("/print/shoppingList/list-id")
      .query({ version: "1", groupCategories: "true" })
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    const locals = renderedLocals[0];
    expect(locals.categoryTitles).toEqual(
      expect.arrayContaining(["Baking", "Spices", "Condiments", "Produce"]),
    );
  });

  it("falls back to uncategorized for a category the app does not know", async () => {
    shoppingListFindUniqueMock.mockResolvedValue({
      id: "list-id",
      title: "Groceries",
      categoryOrder: null,
      items: [item("Mystery", "::notacategory")],
    });

    const app = await buildApp();
    const response = await request(app)
      .get("/print/shoppingList/list-id")
      .query({ version: "1", groupCategories: "true" })
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    const locals = renderedLocals[0];
    expect(locals.categoryTitles).toEqual(["Uncategorized"]);
  });

  it("returns not found when the caller has no access", async () => {
    shoppingListFindUniqueMock.mockResolvedValue({
      id: "list-id",
      title: "Groceries",
      categoryOrder: null,
      items: [],
    });
    getAccessToShoppingListMock.mockResolvedValue({ level: "none" });

    const app = await buildApp();
    const response = await request(app)
      .get("/print/shoppingList/list-id")
      .query({ version: "1" })
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(404);
  });
});

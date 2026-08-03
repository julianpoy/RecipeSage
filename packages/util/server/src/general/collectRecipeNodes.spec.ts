import { describe, it, expect } from "vitest";
import { collectRecipeNodes } from "./collectRecipeNodes";

const namesOf = (nodes: { name?: string }[]) => nodes.map((node) => node.name);

describe("collectRecipeNodes", () => {
  describe("type matching", () => {
    it("collects a plain Recipe node", () => {
      expect(
        namesOf(collectRecipeNodes({ "@type": "Recipe", name: "Soup" })),
      ).toEqual(["Soup"]);
    });

    it("collects a node typed as several things at once", () => {
      expect(
        namesOf(
          collectRecipeNodes({
            "@type": ["NewsArticle", "Recipe"],
            name: "Soup",
          }),
        ),
      ).toEqual(["Soup"]);
    });

    it("collects a node typed with a full schema.org IRI", () => {
      expect(
        namesOf(
          collectRecipeNodes({
            "@type": "http://schema.org/Recipe",
            name: "Soup",
          }),
        ),
      ).toEqual(["Soup"]);
    });

    it("collects a node typed with a compacted IRI prefix", () => {
      expect(
        namesOf(collectRecipeNodes({ "@type": "schema:Recipe", name: "Soup" })),
      ).toEqual(["Soup"]);
    });

    it("collects a node whose type differs in case", () => {
      expect(
        namesOf(collectRecipeNodes({ "@type": "recipe", name: "Soup" })),
      ).toEqual(["Soup"]);
    });

    it("collects a node that uses type rather than @type", () => {
      expect(
        namesOf(collectRecipeNodes({ type: "Recipe", name: "Soup" })),
      ).toEqual(["Soup"]);
    });

    it("skips nodes of an unrelated type", () => {
      expect(
        collectRecipeNodes({ "@type": "WebPage", name: "Not A Recipe" }),
      ).toEqual([]);
    });

    it.each([
      "RecipeCollection",
      "RecipeInstructions",
      "NonRecipe",
      "MasterRecipe",
      "Recipes",
      "my-recipe",
      "_Recipe",
      "wprm.recipe",
      "http://example.com/notarecipe",
    ])("skips nodes typed as %s", (type) => {
      expect(
        collectRecipeNodes({ "@type": type, name: "Not A Recipe" }),
      ).toEqual([]);
    });

    it("prefers @type over type when a node carries both", () => {
      expect(
        collectRecipeNodes({
          "@type": "WebPage",
          type: "Recipe",
          name: "Not A Recipe",
        }),
      ).toEqual([]);
    });

    it("skips nodes with no type at all", () => {
      expect(collectRecipeNodes({ name: "Not A Recipe" })).toEqual([]);
    });

    it("skips nodes whose type is not a string", () => {
      expect(collectRecipeNodes({ "@type": { id: "Recipe" } })).toEqual([]);
    });
  });

  describe("traversal", () => {
    it("collects from a flat array", () => {
      expect(
        namesOf(
          collectRecipeNodes([
            { "@type": "Recipe", name: "Soup" },
            { "@type": "WebPage", name: "Not A Recipe" },
            { "@type": "Recipe", name: "Stew" },
          ]),
        ),
      ).toEqual(["Soup", "Stew"]);
    });

    it("collects from a graph document", () => {
      expect(
        namesOf(
          collectRecipeNodes({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebPage", name: "Not A Recipe" },
              { "@type": "Recipe", name: "Soup" },
            ],
          }),
        ),
      ).toEqual(["Soup"]);
    });

    it("collects from an items container", () => {
      expect(
        namesOf(
          collectRecipeNodes({
            "@type": "ItemList",
            items: [{ "@type": "Recipe", name: "Soup" }],
          }),
        ),
      ).toEqual(["Soup"]);
    });

    it("collects from containers nested within one another", () => {
      expect(
        namesOf(
          collectRecipeNodes({
            "@graph": [
              { items: [{ "@type": "Recipe", name: "Soup" }] },
              [[{ "@type": "Recipe", name: "Stew" }]],
            ],
          }),
        ),
      ).toEqual(["Soup", "Stew"]);
    });

    it("collects from every container a node carries, in a fixed order", () => {
      expect(
        namesOf(
          collectRecipeNodes({
            items: [{ "@type": "Recipe", name: "FromItems" }],
            "@graph": [{ "@type": "Recipe", name: "FromGraph" }],
          }),
        ),
      ).toEqual(["FromGraph", "FromItems"]);
    });

    it.each(["mainEntity", "itemListElement", "recipes", "about"])(
      "does not descend into a %s property",
      (key) => {
        expect(
          collectRecipeNodes({ [key]: [{ "@type": "Recipe", name: "Soup" }] }),
        ).toEqual([]);
      },
    );

    it("collects a container node that is itself a recipe", () => {
      expect(
        namesOf(
          collectRecipeNodes({
            "@type": "Recipe",
            name: "Soup",
            items: [{ "@type": "Recipe", name: "Variation" }],
          }),
        ),
      ).toEqual(["Soup", "Variation"]);
    });
  });

  describe("deeply nested input", () => {
    const nest = (depth: number, leaf: unknown): unknown => {
      let node = leaf;
      for (let index = 0; index < depth; index++) node = [node];
      return node;
    };

    const nestInContainers = (depth: number, leaf: unknown): unknown => {
      let node = leaf;
      for (let index = 0; index < depth; index++) node = { "@graph": node };
      return node;
    };

    const soup = { "@type": "Recipe", name: "Soup" };

    it("collects a recipe at the deepest supported level", () => {
      expect(namesOf(collectRecipeNodes(nest(64, soup)))).toEqual(["Soup"]);
    });

    it("stops descending past the deepest supported level", () => {
      expect(collectRecipeNodes(nest(65, soup))).toEqual([]);
    });

    it("collects a recipe at the deepest supported container level", () => {
      expect(namesOf(collectRecipeNodes(nestInContainers(64, soup)))).toEqual([
        "Soup",
      ]);
    });

    it("stops descending past the deepest supported container level", () => {
      expect(collectRecipeNodes(nestInContainers(65, soup))).toEqual([]);
    });

    it("collects nothing rather than overflowing the stack on arrays", () => {
      expect(collectRecipeNodes(nest(100_000, soup))).toEqual([]);
    });

    it("collects nothing rather than overflowing the stack on containers", () => {
      expect(collectRecipeNodes(nestInContainers(100_000, soup))).toEqual([]);
    });
  });

  describe("non-object input", () => {
    it.each([[null], [undefined], [5], ["Recipe"], [true], [[]], [{}]])(
      "collects nothing from %j",
      (input) => {
        expect(collectRecipeNodes(input)).toEqual([]);
      },
    );
  });
});

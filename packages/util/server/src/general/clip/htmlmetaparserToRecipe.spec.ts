import { describe, it, expect } from "vitest";
import { extractStructuredData } from "./htmlExtract";
import { htmlmetaparserToRecipe } from "./htmlmetaparserToRecipe";

const pageWithJsonLd = (recipe: unknown, lang = "en") =>
  `<html lang="${lang}"><head><script type="application/ld+json">${JSON.stringify(
    recipe,
  )}</script></head><body>recipe</body></html>`;

describe("htmlmetaparserToRecipe (JSON-LD)", () => {
  it("maps a complete recipe and decodes HTML entities", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Choc &amp; Chip Cookies",
        description: "Best cookies",
        recipeYield: "12",
        recipeIngredient: ["1 cup flour &amp; salt", "2 eggs"],
        recipeInstructions: [
          { "@type": "HowToStep", text: "Mix." },
          { "@type": "HowToStep", text: "Bake." },
        ],
        image: { "@type": "ImageObject", url: "https://x/hero.jpg" },
      }),
      "https://example.com/r",
    );

    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result).toBeDefined();
    expect(result?.recipe.title).toBe("Choc & Chip Cookies");
    expect(result?.recipe.yield).toBe("12");
    expect(result?.recipe.ingredients).toBe("1 cup flour & salt\n2 eggs");
    expect(result?.recipe.instructions).toBe("Mix.\nBake.");
    expect(result?.images).toEqual(["https://x/hero.jpg"]);
  });

  it("converts ISO-8601 durations to localized text", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Timed",
        prepTime: "PT15M",
        totalTime: "PT1H30M",
        recipeIngredient: ["x"],
        recipeInstructions: ["y"],
      }),
    );
    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result?.recipe.activeTime).toBe("15 minutes");
    expect(result?.recipe.totalTime).toBe("1 hour 30 minutes");
  });

  it("localizes durations using the page language", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd(
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          name: "Tiramisù",
          totalTime: "PT46M",
          recipeIngredient: ["Mascarpone"],
          recipeInstructions: ["Mescolare."],
        },
        "it",
      ),
    );
    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result?.recipe.totalTime).toBe("46 minuti");
  });

  it("falls back to cookTime when totalTime is absent", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Cook Only",
        cookTime: "PT45M",
        recipeIngredient: ["x"],
        recipeInstructions: ["y"],
      }),
    );
    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result?.recipe.totalTime).toBe("45 minutes");
  });

  it("emits bracketed section headers for HowToSection", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Layered Cake",
        recipeIngredient: ["flour"],
        recipeInstructions: [
          {
            "@type": "HowToSection",
            name: "For the cake",
            itemListElement: [{ "@type": "HowToStep", text: "Bake the cake." }],
          },
          {
            "@type": "HowToSection",
            name: "For the frosting",
            itemListElement: [{ "@type": "HowToStep", text: "Whip it." }],
          },
        ],
      }),
    );
    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result?.recipe.instructions).toBe(
      "[For the cake]\nBake the cake.\n[For the frosting]\nWhip it.",
    );
  });

  it("finds a Recipe nested in an @graph", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebPage", name: "A page" },
          {
            "@type": "Recipe",
            name: "Graph Recipe",
            recipeIngredient: ["water"],
            recipeInstructions: ["Boil."],
          },
        ],
      }),
    );
    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result?.recipe.title).toBe("Graph Recipe");
  });

  it("recognizes a Recipe whose @type is an array", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": ["Recipe", "NewsArticle"],
        name: "Multi Type",
        recipeIngredient: ["salt"],
        recipeInstructions: ["Season."],
      }),
    );
    expect(htmlmetaparserToRecipe(structured, "jsonld")?.recipe.title).toBe(
      "Multi Type",
    );
  });

  it("maps nutrition to structured fields", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Nutritious",
        recipeIngredient: ["x"],
        recipeInstructions: ["y"],
        nutrition: {
          "@type": "NutritionInformation",
          calories: "158 kcal",
          proteinContent: "5 g",
        },
      }),
    );
    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result?.recipe.nutritionCalories).toBe(158);
    expect(result?.recipe.nutritionProtein).toBe(5);
  });

  it("uses the author as the source", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Authored",
        author: { "@type": "Person", name: "Jane Doe" },
        recipeIngredient: ["x"],
        recipeInstructions: ["y"],
      }),
    );
    expect(htmlmetaparserToRecipe(structured, "jsonld")?.recipe.source).toBe(
      "Jane Doe",
    );
  });

  it("strips embedded HTML while preserving literal comparison brackets", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Tagged",
        description: "Reduce while a < b, then <strong>serve</strong>",
        recipeIngredient: ['1 cup <a href="x">flour</a>'],
        recipeInstructions: ["Mix."],
      }),
    );
    const result = htmlmetaparserToRecipe(structured, "jsonld");
    expect(result?.recipe.description).toBe("Reduce while a < b, then serve");
    expect(result?.recipe.ingredients).toBe("1 cup flour");
  });

  it("picks the richest Recipe when several are present", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Recipe",
            name: "Thumbnail Stub",
            recipeIngredient: ["water"],
          },
          {
            "@type": "Recipe",
            name: "Main Recipe",
            recipeIngredient: ["flour", "sugar", "eggs"],
            recipeInstructions: ["Mix.", "Bake."],
          },
        ],
      }),
    );
    expect(htmlmetaparserToRecipe(structured, "jsonld")?.recipe.title).toBe(
      "Main Recipe",
    );
  });

  it("resolves image as a bare string or an array of strings", async () => {
    const asString = htmlmetaparserToRecipe(
      await extractStructuredData(
        pageWithJsonLd({
          "@context": "https://schema.org",
          "@type": "Recipe",
          name: "A",
          image: "https://x/a.jpg",
          recipeIngredient: ["x"],
          recipeInstructions: ["y"],
        }),
      ),
      "jsonld",
    );
    expect(asString?.images).toEqual(["https://x/a.jpg"]);

    const asArray = htmlmetaparserToRecipe(
      await extractStructuredData(
        pageWithJsonLd({
          "@context": "https://schema.org",
          "@type": "Recipe",
          name: "B",
          image: ["https://x/b1.jpg", "https://x/b2.jpg"],
          recipeIngredient: ["x"],
          recipeInstructions: ["y"],
        }),
      ),
      "jsonld",
    );
    expect(asArray?.images).toEqual(["https://x/b1.jpg", "https://x/b2.jpg"]);
  });

  it("returns undefined when no recipe is present", async () => {
    const structured = await extractStructuredData(
      pageWithJsonLd({ "@context": "https://schema.org", "@type": "WebPage" }),
    );
    expect(htmlmetaparserToRecipe(structured, "jsonld")).toBeUndefined();
  });
});

describe("htmlmetaparserToRecipe (microdata)", () => {
  it("maps a schema.org microdata recipe", async () => {
    const html = `<html lang="en"><body>
      <div itemscope itemtype="http://schema.org/Recipe">
        <h1 itemprop="name">Microdata Cake</h1>
        <span itemprop="recipeYield">8 servings</span>
        <li itemprop="recipeIngredient">2 cups flour</li>
        <li itemprop="recipeIngredient">1 cup sugar</li>
        <div itemprop="recipeInstructions">Mix well.</div>
      </div></body></html>`;
    const structured = await extractStructuredData(html);
    const result = htmlmetaparserToRecipe(structured, "microdata");
    expect(result?.recipe.title).toBe("Microdata Cake");
    expect(result?.recipe.yield).toBe("8 servings");
    expect(result?.recipe.ingredients).toBe("2 cups flour\n1 cup sugar");
    expect(result?.recipe.instructions).toBe("Mix well.");
  });

  it("extracts image, author and nutrition from microdata", async () => {
    const html = `<html lang="en"><body>
      <div itemscope itemtype="http://schema.org/Recipe">
        <h1 itemprop="name">Imaged Cake</h1>
        <img itemprop="image" src="https://x/microcake.jpg" />
        <div itemprop="author" itemscope itemtype="http://schema.org/Person">
          <span itemprop="name">Jane Doe</span>
        </div>
        <li itemprop="recipeIngredient">2 cups flour</li>
        <div itemprop="recipeInstructions">Mix well.</div>
        <div itemprop="nutrition" itemscope itemtype="http://schema.org/NutritionInformation">
          <span itemprop="calories">158 kcal</span>
          <span itemprop="proteinContent">5 g</span>
        </div>
      </div></body></html>`;
    const structured = await extractStructuredData(html, "https://x/");
    const result = htmlmetaparserToRecipe(structured, "microdata");
    expect(result?.images).toEqual(["https://x/microcake.jpg"]);
    expect(result?.recipe.source).toBe("Jane Doe");
    expect(result?.recipe.nutritionCalories).toBe(158);
    expect(result?.recipe.nutritionProtein).toBe(5);
  });
});

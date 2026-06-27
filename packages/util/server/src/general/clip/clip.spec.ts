import { describe, it, expect, vi, beforeEach } from "vitest";

const textToRecipeMock = vi.fn();

vi.mock("../../ml", () => ({
  TextToRecipeInputType: {
    OCR: "OCR",
    Document: "Document",
    Text: "Text",
    Webpage: "Webpage",
  },
  textToRecipe: (...args: unknown[]) => textToRecipeMock(...args),
  ocrImagesToRecipe: vi.fn(),
  pdfToRecipe: vi.fn(),
}));

vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const llmEntry = (recipe: {
  title: string;
  ingredients: string;
  instructions: string;
}) => ({
  recipe: {
    title: recipe.title,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  },
  images: [],
  labels: [],
});

describe("clipHtml grounding gate", () => {
  beforeEach(() => {
    textToRecipeMock.mockReset();
  });

  it("drops an ungrounded LLM result instead of surfacing the invention", async () => {
    const html = `<html><body>
      <h1>Spring Gardening Notes</h1>
      <p>Tips for planting tomatoes and peppers in raised beds this season.</p>
      <p>Water in the early morning and mulch to retain moisture.</p>
    </body></html>`;

    textToRecipeMock.mockResolvedValue(
      llmEntry({
        title: "One Pan Jambalaya",
        ingredients:
          "1 lb large shrimp, peeled and deveined\n2 cups long grain white rice",
        instructions:
          "Whisk together the buttermilk and hot sauce and chill overnight.",
      }),
    );

    const { clipHtml } = await import("./clip");
    const result = await clipHtml(html);

    expect(textToRecipeMock).toHaveBeenCalledOnce();
    expect(result.recipe.title).toBe("");
    expect(result.recipe.ingredients).toBeFalsy();
    expect(result.recipe.instructions).toBeFalsy();
  });

  it("keeps an LLM result that is grounded in the page text", async () => {
    const html = `<html><body>
      <h1>Easy Pancakes</h1>
      <p>1 cup all purpose flour</p>
      <p>1 tablespoon white granulated sugar</p>
      <p>Mix the flour and sugar together in a large bowl.</p>
      <p>Cook on a hot griddle until golden brown on both sides.</p>
    </body></html>`;

    textToRecipeMock.mockResolvedValue(
      llmEntry({
        title: "Easy Pancakes",
        ingredients:
          "1 cup all purpose flour\n1 tablespoon white granulated sugar",
        instructions:
          "Mix the flour and sugar together in a large bowl.\nCook on a hot griddle until golden brown on both sides.",
      }),
    );

    const { clipHtml } = await import("./clip");
    const result = await clipHtml(html);

    expect(textToRecipeMock).toHaveBeenCalledOnce();
    expect(result.recipe.title).toBe("Easy Pancakes");
    expect(result.recipe.ingredients).toContain("flour");
    expect(result.recipe.instructions).toContain("griddle");
  });

  it("never reaches the LLM when grounded structured data already yields a recipe", async () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Structured Soup",
      recipeIngredient: [
        "2 large carrots, peeled and diced",
        "1 yellow onion, chopped",
      ],
      recipeInstructions: "Simmer the carrots and onion in broth until tender.",
    };
    const html = `<html><body>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <h1>Structured Soup</h1>
      <p>2 large carrots, peeled and diced</p>
      <p>1 yellow onion, chopped</p>
      <p>Simmer the carrots and onion in broth until tender.</p>
    </body></html>`;

    const { clipHtml } = await import("./clip");
    const result = await clipHtml(html);

    expect(textToRecipeMock).not.toHaveBeenCalled();
    expect(result.recipe.title).toBe("Structured Soup");
    expect(result.recipe.ingredients).toContain("carrots");
  });

  it("selects the structured recipe grounded in the page over a richer unrelated one", async () => {
    const main = {
      "@type": "Recipe",
      name: "Ground Beef Bulgogi",
      recipeIngredient: [
        "1 pound lean ground beef",
        "2 tablespoons soy sauce",
        "1 tablespoon light brown sugar",
      ],
      recipeInstructions:
        "Brown the ground beef in a hot skillet, then stir in the soy sauce and brown sugar.",
    };
    const related = {
      "@type": "Recipe",
      name: "Japchae Glass Noodles",
      recipeIngredient: [
        "6 ounces sweet potato glass noodles",
        "2 cloves garlic, minced",
        "1 large carrot, julienned",
        "2 green onions, sliced",
        "1 tablespoon toasted sesame oil",
      ],
      recipeInstructions:
        "Boil the glass noodles, rinse, then toss with the sesame oil and vegetables.",
    };
    const html = `<html><body>
      <script type="application/ld+json">${JSON.stringify(main)}</script>
      <script type="application/ld+json">${JSON.stringify(related)}</script>
      <h1>Ground Beef Bulgogi</h1>
      <p>1 pound lean ground beef</p>
      <p>2 tablespoons soy sauce</p>
      <p>1 tablespoon light brown sugar</p>
      <p>Brown the ground beef in a hot skillet, then stir in the soy sauce and brown sugar.</p>
    </body></html>`;

    const { clipHtml } = await import("./clip");
    const result = await clipHtml(html);

    expect(textToRecipeMock).not.toHaveBeenCalled();
    expect(result.recipe.title).toBe("Ground Beef Bulgogi");
    expect(result.recipe.ingredients).toContain("ground beef");
    expect(result.recipe.ingredients).not.toContain("glass noodles");
  });

  it("falls back to the LLM when the JSON-LD recipe is not grounded in the page", async () => {
    const jsonLd = {
      "@type": "Recipe",
      name: "Phantom Casserole",
      recipeIngredient: [
        "3 cups dried elbow macaroni",
        "1 pound sharp cheddar cheese, shredded",
      ],
      recipeInstructions:
        "Boil the macaroni, then fold in the cheddar and bake until bubbly.",
    };
    const html = `<html><body>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <h1>Simple Garlic Bread</h1>
      <p>1 loaf ciabatta bread, sliced lengthwise</p>
      <p>half cup salted butter, softened to room temperature</p>
      <p>Spread the softened butter over the ciabatta and broil until golden.</p>
    </body></html>`;

    textToRecipeMock.mockResolvedValue(
      llmEntry({
        title: "Simple Garlic Bread",
        ingredients:
          "1 loaf ciabatta bread, sliced lengthwise\nhalf cup salted butter, softened to room temperature",
        instructions:
          "Spread the softened butter over the ciabatta and broil until golden.",
      }),
    );

    const { clipHtml } = await import("./clip");
    const result = await clipHtml(html);

    expect(textToRecipeMock).toHaveBeenCalledOnce();
    expect(result.recipe.title).toBe("Simple Garlic Bread");
    expect(result.recipe.ingredients).toContain("ciabatta");
  });

  it("keeps the ungrounded JSON-LD recipe as a fallback when the LLM also fails to ground", async () => {
    const jsonLd = {
      "@type": "Recipe",
      name: "Hidden Casserole",
      recipeIngredient: [
        "3 cups dried elbow macaroni",
        "1 pound sharp cheddar cheese, shredded",
      ],
      recipeInstructions:
        "Boil the macaroni, then fold in the cheddar and bake until bubbly.",
    };
    const html = `<html><body>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <h1>Hidden Casserole</h1>
      <p>Loading the recipe card, please enable JavaScript to view it.</p>
    </body></html>`;

    textToRecipeMock.mockResolvedValue(
      llmEntry({
        title: "Invented Dish",
        ingredients: "2 cups uncooked quinoa\n1 bunch fresh basil leaves",
        instructions: "Roast the quinoa and toss it with the basil pesto.",
      }),
    );

    const { clipHtml } = await import("./clip");
    const result = await clipHtml(html);

    expect(result.recipe.title).toBe("Hidden Casserole");
    expect(result.recipe.ingredients).toContain("macaroni");
  });
});

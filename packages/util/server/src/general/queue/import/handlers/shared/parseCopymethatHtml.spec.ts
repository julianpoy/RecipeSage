import { describe, it, expect } from "vitest";
import { parseCopymethatHtml } from "./parseCopymethatHtml";

const wrap = (recipeBlock: string) => `<!DOCTYPE html>
<html><body>${recipeBlock}</body></html>`;

const recipe = (inner: string) => `<div class="recipe">${inner}</div>`;

describe("parseCopymethatHtml", () => {
  describe("labels (recipeCategory)", () => {
    it("imports multiple categories as labels", () => {
      const html = wrap(
        recipe(`
          <div id="name">Burrito Bowl</div>
          <div id="categories">
            <span>Tags: </span>
            <span class="recipeCategory">Mexican/Tex-Mex</span><span> </span>
            <span class="recipeCategory">To go</span><span> </span>
            <span class="recipeCategory">Veggie Stars</span><span> </span>
          </div>
        `),
      );

      const parsed = parseCopymethatHtml(html);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].labels).toEqual([
        "mexican/tex-mex",
        "to go",
        "veggie stars",
      ]);
    });

    it("imports a single category as a label", () => {
      const html = wrap(
        recipe(`
          <div id="name">Holiday Cookies</div>
          <div id="categories">
            <span>Tags: </span>
            <span class="recipeCategory">Christmas</span><span> </span>
          </div>
        `),
      );

      expect(parseCopymethatHtml(html)[0].labels).toEqual(["christmas"]);
    });

    it("decodes HTML entities like & in category names", () => {
      const html = wrap(
        recipe(`
          <div id="name">Focaccia</div>
          <div id="categories">
            <span>Tags: </span>
            <span class="recipeCategory">Bread &amp; Pizza</span><span> </span>
          </div>
        `),
      );

      expect(parseCopymethatHtml(html)[0].labels).toEqual(["bread & pizza"]);
    });

    it("returns no labels when categories block is missing", () => {
      const html = wrap(recipe(`<div id="name">Plain Recipe</div>`));
      expect(parseCopymethatHtml(html)[0].labels).toEqual([]);
    });

    it("trims whitespace from category text", () => {
      const html = wrap(
        recipe(`
          <div id="name">Whitespace Test</div>
          <div id="categories">
            <span class="recipeCategory">
              Breakfast
            </span>
          </div>
        `),
      );

      expect(parseCopymethatHtml(html)[0].labels).toEqual(["breakfast"]);
    });
  });

  describe("labels (extra_info)", () => {
    it("imports extra_info child ids as labels and skips rating", () => {
      const html = wrap(
        recipe(`
          <div id="name">Star Recipe</div>
          <div id="extra_info">
            <div id="made_this">Made this</div>
            <div id="starred">Starred</div>
            <div id="rating">5</div>
          </div>
        `),
      );

      expect(parseCopymethatHtml(html)[0].labels).toEqual([
        "made_this",
        "starred",
      ]);
    });

    it("merges extra_info labels with recipeCategory labels", () => {
      const html = wrap(
        recipe(`
          <div id="name">Combined</div>
          <div id="extra_info">
            <div id="made_this">Made this</div>
          </div>
          <div id="categories">
            <span class="recipeCategory">Dinner</span>
          </div>
        `),
      );

      expect(parseCopymethatHtml(html)[0].labels).toEqual([
        "made_this",
        "dinner",
      ]);
    });
  });

  describe("recipe fields", () => {
    it("parses a complete recipe block", () => {
      const html = wrap(
        recipe(`
          <div id="name">Overnight Breakfast Rice Pudding</div>
          <div id="link">
            Adapted from <a id="original_link" href="https://example.com/pudding">https://example.com/pudding</a>
          </div>
          <img class="recipeImage" src="images/pudding.jpg" />
          <div id="categories">
            <span class="recipeCategory">Breakfast</span>
            <span class="recipeCategory">To go</span>
          </div>
          <div id="description">A make-ahead breakfast.</div>
          <div id="servings">Servings: <a id="recipeYield">2</a></div>
          <ul id="recipeIngredients">
            <li class="recipeIngredient">1 cup brown rice</li>
            <li class="recipeIngredient">2/3 cup milk</li>
          </ul>
          <ol id="recipeInstructions">
            <li class="instruction" value="1">Mix everything.</li>
            <li class="instruction" value="2">Refrigerate overnight.</li>
          </ol>
          <ul id="recipeNotes">
            <li class="recipeNote">Can also be served warm.</li>
          </ul>
        `),
      );

      const parsed = parseCopymethatHtml(html);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        title: "Overnight Breakfast Rice Pudding",
        description: "A make-ahead breakfast.",
        sourceUrl: "https://example.com/pudding",
        servings: "2",
        ingredients: "1 cup brown rice\n2/3 cup milk",
        instructions: "Mix everything.\nRefrigerate overnight.",
        labels: ["breakfast", "to go"],
        imageSrcs: ["images/pudding.jpg"],
      });
      expect(parsed[0].notes).toContain("Can also be served warm.");
    });

    it("returns an empty title when name is missing", () => {
      const html = wrap(recipe(`<div id="categories"></div>`));
      expect(parseCopymethatHtml(html)[0].title).toBe("");
    });

    it("returns multiple recipes from a multi-recipe document", () => {
      const html = wrap(
        recipe(`<div id="name">First</div>`) +
          recipe(`<div id="name">Second</div>`) +
          recipe(`<div id="name">Third</div>`),
      );

      const parsed = parseCopymethatHtml(html);
      expect(parsed.map((r) => r.title)).toEqual(["First", "Second", "Third"]);
    });

    it("parses rating as a number when present", () => {
      const html = wrap(
        recipe(`
          <div id="name">Rated</div>
          <div id="extra_info">
            <div id="rating"><span id="ratingValue">4</span></div>
          </div>
        `),
      );

      expect(parseCopymethatHtml(html)[0].rating).toBe(4);
    });

    it("returns undefined rating when missing", () => {
      const html = wrap(recipe(`<div id="name">Unrated</div>`));
      expect(parseCopymethatHtml(html)[0].rating).toBeUndefined();
    });

    it("dedupes image srcs", () => {
      const html = wrap(
        recipe(`
          <div id="name">Multi-image</div>
          <img src="images/a.jpg" />
          <img src="images/a.jpg" />
          <img src="images/b.jpg" />
        `),
      );

      expect(parseCopymethatHtml(html)[0].imageSrcs).toEqual([
        "images/a.jpg",
        "images/b.jpg",
      ]);
    });
  });
});

import workerpool from "workerpool";
import jsdom from "jsdom";
import sanitizeHtml from "sanitize-html";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore No typings available
import RecipeClipper from "@julianpoy/recipe-clipper";

const replaceBrWithBreak = (html: string) => {
  return html.replaceAll(new RegExp(/<br( \/)?>/, "g"), "\n");
};

async function clipRecipeHtmlWithJSDOM(document: string) {
  const dom = new jsdom.JSDOM(document);

  const { window } = dom;

  Object.defineProperty(window.Element.prototype, "innerText", {
    get() {
      const html = replaceBrWithBreak(this.innerHTML);
      return sanitizeHtml(html, {
        allowedTags: [], // remove all tags and return text content only
        allowedAttributes: {}, // remove all tags and return text content only
      });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window.fetch as any) = fetch;

  return await RecipeClipper.clipRecipe({
    window,
    mlClassifyEndpoint: process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL,
    ignoreMLClassifyErrors: true,
  });
}

workerpool.worker({
  clipRecipeHtmlWithJSDOM: clipRecipeHtmlWithJSDOM,
});

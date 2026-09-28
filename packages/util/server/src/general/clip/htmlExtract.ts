import { Parser } from "htmlparser2";
import { Handler, Result } from "htmlmetaparser";

const SKIP_CONTENT_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "head",
  "nav",
  "footer",
  "form",
  "aside",
  "button",
  "select",
  "option",
]);

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "li",
  "tr",
  "section",
  "article",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "br",
  "td",
  "th",
  "dd",
  "dt",
]);

export const extractStructuredData = (
  html: string,
  url?: string,
): Promise<Result> => {
  return new Promise((resolve, reject) => {
    const handler = new Handler(
      (err, result) => (err ? reject(err) : resolve(result)),
      { url: url || "" },
    );
    const parser = new Parser(handler, { decodeEntities: true });
    parser.write(html);
    parser.end();
  });
};

export interface PageText {
  text: string;
  ogImage?: string;
}

const normalizeText = (value: string) =>
  value
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const extractPageText = (html: string): PageText => {
  const skipStack: string[] = [];
  const parts: string[] = [];
  let ogImage: string | undefined;
  let twitterImage: string | undefined;
  let ogTitle: string | undefined;
  let ogDescription: string | undefined;

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (SKIP_CONTENT_TAGS.has(name)) {
          skipStack.push(name);
        }
        if (name === "meta") {
          const key = (attribs.property || attribs.name || "").toLowerCase();
          const content = attribs.content;
          if (content) {
            if (key === "og:image" && !ogImage) ogImage = content;
            if (key === "twitter:image" && !twitterImage)
              twitterImage = content;
            if (key === "og:title" && !ogTitle) ogTitle = content;
            if (key === "og:description" && !ogDescription)
              ogDescription = content;
          }
        }
      },
      ontext(text) {
        if (skipStack.length > 0) return;
        parts.push(text);
      },
      onclosetag(name) {
        if (SKIP_CONTENT_TAGS.has(name)) {
          const idx = skipStack.lastIndexOf(name);
          if (idx !== -1) skipStack.splice(idx, 1);
        }
        if (BLOCK_TAGS.has(name)) parts.push("\n");
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();

  const bodyText = normalizeText(parts.join(""));
  const collapsedBodyText = collapseWhitespace(bodyText);

  const metaText = [ogTitle, ogDescription]
    .map((value) => normalizeText(value || ""))
    .filter(
      (value) =>
        value.length > 0 &&
        !collapsedBodyText.includes(collapseWhitespace(value)),
    );

  const text = [...new Set(metaText), bodyText]
    .filter((value) => value.length > 0)
    .join("\n");

  return { text, ogImage: ogImage || twitterImage };
};

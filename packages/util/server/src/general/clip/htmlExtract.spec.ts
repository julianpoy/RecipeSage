import { describe, it, expect } from "vitest";
import { extractStructuredData, extractPageText } from "./htmlExtract";

describe("extractPageText", () => {
  it("extracts visible body text and skips scripts, styles and nav", () => {
    const html = `<html><head><style>.x{color:red}</style>
      <script>var a = 1;</script></head>
      <body>
        <nav>Home About Contact</nav>
        <h1>Pancakes</h1>
        <p>Fluffy and delicious.</p>
        <footer>Copyright</footer>
      </body></html>`;
    const { text } = extractPageText(html);
    expect(text).toContain("Pancakes");
    expect(text).toContain("Fluffy and delicious.");
    expect(text).not.toContain("var a = 1");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("Home About Contact");
    expect(text).not.toContain("Copyright");
  });

  it("separates adjacent table cells so text does not run together", () => {
    const html = `<html><body><table><tr>
      <td>1 cup</td><td>flour</td></tr></table></body></html>`;
    const { text } = extractPageText(html);
    expect(text).not.toContain("1 cupflour");
    expect(text).toContain("1 cup");
    expect(text).toContain("flour");
  });

  it("captures the og:image meta tag", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://x/social.jpg" />
      </head><body>hi</body></html>`;
    const { ogImage } = extractPageText(html);
    expect(ogImage).toBe("https://x/social.jpg");
  });

  it("includes og:title and og:description text that the body does not contain", () => {
    const html = `<html><head>
      <meta property="og:title" content="Chef on Instagram: &quot;Butternut Squash Soup&#10;Ingredients:&#10;- 1 squash&#10;Instructions:&#10;1. Roast it&quot;" />
      <meta property="og:description" content="1,000 likes - A cozy soup" />
      </head><body><div>Log in</div></body></html>`;
    const { text } = extractPageText(html);
    expect(text).toContain("Butternut Squash Soup\nIngredients:\n- 1 squash");
    expect(text).toContain("1. Roast it");
    expect(text).toContain("1,000 likes - A cozy soup");
    expect(text).toContain("Log in");
  });

  it("does not repeat og:title or og:description text already in the body", () => {
    const html = `<html><head>
      <meta property="og:title" content="Pancakes" />
      <meta property="og:description" content="Fluffy and   delicious." />
      </head><body><h1>Pancakes</h1><p>Fluffy and delicious.</p></body></html>`;
    const { text } = extractPageText(html);
    expect(text).toBe("Pancakes\nFluffy and delicious.");
  });

  it("falls back to twitter:image when og:image is absent", () => {
    const html = `<html><head>
      <meta name="twitter:image" content="https://x/twitter.jpg" />
      </head><body>hi</body></html>`;
    const { ogImage } = extractPageText(html);
    expect(ogImage).toBe("https://x/twitter.jpg");
  });
});

describe("extractStructuredData", () => {
  it("parses JSON-LD from a page", async () => {
    const html = `<html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Recipe","name":"X"}
      </script></head><body></body></html>`;
    const result = await extractStructuredData(html, "https://x/");
    expect(JSON.stringify(result.jsonld)).toContain("Recipe");
  });
});

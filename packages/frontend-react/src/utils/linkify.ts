import LinkifyStr from "linkify-string";
import LinkifyHtml from "linkify-html";

const isRecipesageLink = (href: string): boolean => {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    return host === "recipesage.com" || host.endsWith(".recipesage.com");
  } catch {
    return false;
  }
};

export const linkifyStr = (str: string) => {
  return LinkifyStr(str, {
    target: (href: string, type: string) => {
      if (type !== "url") return "";
      if (isRecipesageLink(href)) return ""; // All recipesage.com should open in same tab
      return "_blank";
    },
    className: "linkified",
  });
};

export const linkifyHtml = (str: string) => {
  return LinkifyHtml(str, {
    target: (href: string, type: string) => {
      if (type !== "url") return "";
      if (isRecipesageLink(href)) return ""; // All recipesage.com should open in same tab
      return "_blank";
    },
    className: "linkified",
  });
};

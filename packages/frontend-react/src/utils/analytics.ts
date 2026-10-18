import {
  detectAppPlatform,
  MATOMO_APP_PLATFORM_DIMENSION_ID,
  MATOMO_CANONICAL_ORIGIN,
  MATOMO_ORIGIN,
  MATOMO_SITE_ID,
} from "@recipesage/util/shared";
import { IS_DESKTOP } from "../environments/environment";

let previousUrl: string | undefined;
let previousPath: string | undefined;

export const analytics = {
  init() {
    const _paq = window._paq || [];

    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    // _paq.push(['trackPageView']);
    _paq.push(["disableCookies"]);
    _paq.push([
      "setCustomDimension",
      MATOMO_APP_PLATFORM_DIMENSION_ID,
      detectAppPlatform(IS_DESKTOP),
    ]);
    _paq.push(["enableLinkTracking"]);

    const u = `${MATOMO_ORIGIN}/`;
    _paq.push(["setTrackerUrl", u + "matomo.php"]);
    _paq.push(["setSiteId", MATOMO_SITE_ID]);
    const g = document.createElement("script");
    const s = document.getElementsByTagName("script")[0];
    g.type = "text/javascript";
    g.async = true;
    g.defer = true;
    g.src = u + "matomo.js";
    s.parentNode?.insertBefore(g, s);

    window._paq = _paq;
  },

  trackPageView(path: string, routePattern: string) {
    try {
      const _paq = window._paq;

      if (!_paq) return;

      if (path === previousPath) return;
      previousPath = path;

      const url = `${MATOMO_CANONICAL_ORIGIN}/app${routePattern}`;

      if (previousUrl) _paq.push(["setReferrerUrl", previousUrl]);
      previousUrl = url;
      _paq.push(["setCustomUrl", url]);
      _paq.push(["setDocumentTitle", routePattern]);

      _paq.push(["trackPageView"]);

      // make Matomo aware of newly added content
      _paq.push(["MediaAnalytics::scanForMedia"]);
      _paq.push(["FormAnalytics::scanForForms"]);
      _paq.push(["trackContentImpressionsWithinNode"]);
      _paq.push(["enableLinkTracking"]);
    } catch (e) {
      console.warn(e);
    }
  },
};

import baseConfig from "../../eslint.config.mjs";
import globals from "globals";

export default [
  {
    ignores: ["**/dist"],
  },
  ...baseConfig,
  { languageOptions: { globals: { ...globals.webextensions } } },
];

import baseConfig from "../../eslint.config.mjs";
import globals from "globals";

export default [
  {
    ignores: ["**/dist"],
  },
  ...baseConfig,
  { languageOptions: { globals: { ...globals.webextensions } } },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    // Override or add rules here
    rules: {},
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    // Override or add rules here
    rules: {},
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    // Override or add rules here
    rules: {},
  },
  {
    ignores: ["dist"],
  },
];

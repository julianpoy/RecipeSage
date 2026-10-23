import tseslint from "typescript-eslint";
import angular from "angular-eslint";

export default tseslint.config(
  {
    ignores: ["projects/**/*"],
  },
  {
    files: ["**/*.ts"],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@angular-eslint/component-selector": 0,
      "@angular-eslint/directive-selector": 0,
      "@angular-eslint/component-class-suffix": 0,
      "@angular-eslint/prefer-on-push-component-change-detection": 0,
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@recipesage/prisma",
              message:
                'The frontend bundle must not depend on @recipesage/prisma at runtime. Use `import type { ... } from "@recipesage/prisma"` instead.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [...angular.configs.templateRecommended],
    rules: {},
  },
);

import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://recipesage.com",
  base: "/",
  trailingSlash: "ignore",
  outDir: "./dist",
  cacheDir: "../../node_modules/.cache/astro-www",
  server: {
    host: true,
  },
  image: {
    domains: ["static.recipesage.com"],
  },
  vite: {
    cacheDir: "../../node_modules/.cache/vite-www",
    server: {
      allowedHosts: true,
      fs: {
        allow: ["../.."],
      },
    },
  },
});

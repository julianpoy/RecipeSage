import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      external: ["electron"],
    },
  },
});

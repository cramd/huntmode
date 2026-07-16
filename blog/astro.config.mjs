import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

const blogRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  site: "https://www.huntmode.ca",
  base: "/blog",
  trailingSlash: "always",
  outDir: "../public/blog",
  build: {
    format: "directory",
  },
  integrations: [
    tailwind({ applyBaseStyles: false, configFile: "./tailwind.config.mjs" }),
    sitemap({
      filter: (page) => !page.includes("/category/"),
    }),
  ],
  vite: {
    root: blogRoot,
    resolve: {
      alias: {
        tailwindcss: fileURLToPath(new URL("./node_modules/tailwindcss", import.meta.url)),
      },
    },
  },
});

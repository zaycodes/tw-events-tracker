import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://tw-events.netlify.app",
  integrations: [sitemap()],
});

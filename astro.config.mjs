// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";
import typography from "@tailwindcss/typography";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
});

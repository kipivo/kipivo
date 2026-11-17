import story from "@fumadocs/story/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [story(), tailwindcss(), react()],
  // The component manual is client-rendered and has no React Server Components.
  build: { rolldownOptions: { checks: { moduleLevelDirective: false } } },
});

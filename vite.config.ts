/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base so the built assets resolve correctly when the app is served
  // from a GitHub Pages project subpath (e.g. /Trak/) — no repo name hardcoded.
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
  },
});

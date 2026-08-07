import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "github-pages",
  base: "/",
  publicDir: "../public",
  define: {
    "process.env.NEXT_PUBLIC_SHADOWFRAME_PROFILE": JSON.stringify("public"),
  },
  plugins: [react()],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});

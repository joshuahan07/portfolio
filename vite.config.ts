import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // Custom domain (joshuahanportfolio.com) uses `/`.
  // Project Pages only (joshuahan07.github.io/portfolio/) needs `/portfolio/`.
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

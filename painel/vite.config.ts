import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Inline PostCSS config: stops Vite from picking up the repo root Tailwind config
  css: { postcss: { plugins: [] } },
  server: { port: 5173, strictPort: true },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "wouter", "@tanstack/react-query"],
          charts: ["recharts"],
        },
      },
    },
  },
});

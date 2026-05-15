import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: __dirname,
  cacheDir: "/tmp/vite-cache-tc",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react","react-dom","react/jsx-runtime","react/jsx-dev-runtime",
             "@tanstack/react-query","@tanstack/query-core"],
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});

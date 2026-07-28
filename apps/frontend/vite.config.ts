import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const __dirname = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replaceAll("\\", "/");
          if (!moduleId.includes("/node_modules/")) return undefined;
          if (moduleId.includes("/recharts/") || moduleId.includes("/d3-"))
            return "charts";
          if (
            moduleId.includes("/@radix-ui/") ||
            moduleId.includes("/cmdk/") ||
            moduleId.includes("/vaul/")
          )
            return "ui";
          if (moduleId.includes("/framer-motion/")) return "animations";
          if (
            moduleId.includes("/@tanstack/") ||
            moduleId.includes("/@trpc/") ||
            moduleId.includes("/superjson/")
          )
            return "data";
          if (
            moduleId.includes("/lucide-react/") ||
            moduleId.includes("/react-icons/")
          )
            return "icons";
          if (moduleId.includes("/date-fns/")) return "dates";
          return "framework";
        },
      },
    },
  },
});

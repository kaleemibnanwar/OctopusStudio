import { builtinModules } from "node:module";
import { defineConfig } from "vite";
import path from "path";

const nodeBuiltins = builtinModules.flatMap((name) => [name, `node:${name}`]);

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [...nodeBuiltins],
    },
  },
});

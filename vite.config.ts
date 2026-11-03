/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const host: string | undefined = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [svelte()],

  // WebKit de macOS 13 (plan 3.1)
  build: {
    target: "safari16",
  },

  // Opciones para Tauri: no tapar los errores de Rust, puerto fijo,
  // y no vigilar src-tauri
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

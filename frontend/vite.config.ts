import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  define: {
    global: "globalThis",
  },
  resolve: {
    dedupe: ["@stellar/stellar-sdk", "@stellar/stellar-base", "@stellar/js-xdr"],
  },
  optimizeDeps: {
    include: ["@stellar/stellar-sdk", "@stellar/stellar-base", "@stellar/js-xdr"],
  },
});

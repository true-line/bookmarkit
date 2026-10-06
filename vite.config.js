import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Chrome extensions require relative asset paths so that
  // chrome-extension:// URLs resolve correctly. './' turns all
  // /assets/... references into ./assets/... and removes the
  // crossorigin attribute that breaks dynamic chunk loading in MV3.
  base: "./",
  build: {
    sourcemap: mode === "development",
    minify: mode !== "development",
    rollupOptions: {
      // #51: two entry points — the full app and the toolbar popup. Both are built
      // by Vite so the popup gets the same hashed/bundled assets as the app.
      input: {
        main: resolve(__dirname, "index.html"),
        popup: resolve(__dirname, "popup.html"),
      },
      output: {
        manualChunks: {
          // React runtime — stable, cache-friendly. 'react-dom/client' is a distinct
          // module id from 'react-dom'; without it listed, the react-dom runtime lands
          // in whichever shared chunk Rollup synthesizes instead of here.
          "react-vendor": ["react", "react-dom", "react-dom/client"],
          // Firebase split by sub-package so each chunk stays under 500 kB
          "firebase-app": ["firebase/app"],
          "firebase-auth": ["firebase/auth"],
          "firebase-firestore": ["firebase/firestore"],
          // three.js is only reachable through dynamic imports (the 3D brand
          // mark and empty-state stack), so this chunk never loads with the app
          // or the popup — naming it keeps it out of the synthesized chunks.
          three: ["three"],
        },
      },
    },
  },
}));

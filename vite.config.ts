import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.jpg", "apple-touch-icon.jpg", "pwa-192x192.jpg", "pwa-512x512.jpg"],
      manifest: {
        name: "Villa Hermia Staycation",
        short_name: "Villa Hermia",
        description: "Villa Hermia Staycation - Admin Dashboard",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.jpg",
            sizes: "192x192",
            type: "image/jpeg",
          },
          {
            src: "pwa-512x512.jpg",
            sizes: "512x512",
            type: "image/jpeg",
          },
          {
            src: "pwa-512x512.jpg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,jpg,png,svg}"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

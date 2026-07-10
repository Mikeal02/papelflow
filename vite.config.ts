import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Elite build configuration.
 *
 * Goals:
 *  - Ship the tiniest possible first-paint bundle (auth page cold-start).
 *  - Shard vendor code so a change to one library never busts unrelated caches.
 *  - Keep heavy, rarely-used libs (pdf, charts, calendar, carousel) OUT of the
 *    initial graph — they must only load when a route/component asks for them.
 *  - Warm the browser's parser via aggressive modulepreload of split chunks.
 */

// Explicit vendor buckets. Order matters: the first match wins.
// Each bucket is picked so it aligns with a real user journey — e.g. `pdf`
// only loads when the user opens the tax/reports export flow.
const VENDOR_BUCKETS: Array<{ name: string; test: (id: string) => boolean }> = [
  { name: "vendor-react",        test: (id) => /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/.test(id) },
  { name: "vendor-router",       test: (id) => /[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run[\\/]router)[\\/]/.test(id) },
  { name: "vendor-query",        test: (id) => /[\\/]node_modules[\\/]@tanstack[\\/]/.test(id) },
  { name: "vendor-supabase",     test: (id) => /[\\/]node_modules[\\/]@supabase[\\/]/.test(id) },
  { name: "vendor-motion",       test: (id) => /[\\/]node_modules[\\/]framer-motion[\\/]/.test(id) },
  { name: "vendor-charts",       test: (id) => /[\\/]node_modules[\\/](recharts|d3-[^/]+|victory-vendor|internmap)[\\/]/.test(id) },
  { name: "vendor-pdf",          test: (id) => /[\\/]node_modules[\\/](jspdf|jspdf-autotable|canvg|html2canvas|dompurify)[\\/]/.test(id) },
  { name: "vendor-forms",        test: (id) => /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id) },
  { name: "vendor-dates",        test: (id) => /[\\/]node_modules[\\/](date-fns|react-day-picker|@internationalized[\\/]date)[\\/]/.test(id) },
  { name: "vendor-radix",        test: (id) => /[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id) },
  { name: "vendor-aria",         test: (id) => /[\\/]node_modules[\\/](react-aria-components|@react-aria|@react-stately|@react-types)[\\/]/.test(id) },
  { name: "vendor-icons-lucide", test: (id) => /[\\/]node_modules[\\/]lucide-react[\\/]/.test(id) },
  { name: "vendor-icons-rc",     test: (id) => /[\\/]node_modules[\\/](react-icons|@radix-ui[\\/]react-icons)[\\/]/.test(id) },
  { name: "vendor-carousel",     test: (id) => /[\\/]node_modules[\\/](embla-carousel[^/]*|vaul)[\\/]/.test(id) },
  { name: "vendor-cmdk",         test: (id) => /[\\/]node_modules[\\/](cmdk|sonner|input-otp)[\\/]/.test(id) },
  { name: "vendor-storage",      test: (id) => /[\\/]node_modules[\\/]idb[\\/]/.test(id) },
  { name: "vendor-utils",        test: (id) => /[\\/]node_modules[\\/](clsx|class-variance-authority|tailwind-merge|tailwindcss-animate|next-themes)[\\/]/.test(id) },
];

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Pre-bundle heavy CJS deps so dev cold-start stays fast.
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "@supabase/supabase-js",
        "framer-motion",
        "lucide-react",
        "date-fns",
        "clsx",
        "tailwind-merge",
      ],
    },
    esbuild: isProd
      ? {
          // Strip debug noise from production bundles.
          drop: ["console", "debugger"],
          legalComments: "none",
        }
      : undefined,
    build: {
      target: "es2020",
      minify: "esbuild",
      cssMinify: "lightningcss" as unknown as boolean,
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 800,
      modulePreload: { polyfill: true },
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          // Long-term cacheable filenames.
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            for (const bucket of VENDOR_BUCKETS) {
              if (bucket.test(id)) return bucket.name;
            }
            // Everything else in node_modules gets pooled — keeps the graph tidy
            // without producing hundreds of tiny chunks.
            return "vendor-misc";
          },
        },
      },
    },
  };
});

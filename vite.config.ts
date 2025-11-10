import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, Plugin } from "vite";

// Custom plugin to bypass Vite's host check for Shopify CLI tunnels
function allowShopifyTunnelPlugin(): Plugin {
  return {
    name: "allow-shopify-tunnel",
    configureServer(server) {
      // Override the default host check middleware
      server.middlewares.use((req, res, next) => {
        // Allow all hosts - needed for Cloudflare tunnel
        if (req.headers.host?.includes('trycloudflare.com')) {
          req.headers.host = 'localhost:3000';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    allowShopifyTunnelPlugin(),
    remix({
      ignoredRouteFiles: ["**/.*"],
    }),
  ],
  server: {
    port: 3000,
    host: "localhost",
  },
  ssr: {
    noExternal: ["@shopify/shopify-api", "@shopify/shopify-app-remix"],
  },
  optimizeDeps: {
    include: ["@shopify/polaris", "@shopify/app-bridge-react"],
  },
});

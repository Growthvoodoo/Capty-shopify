import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const prismaSessionStorage = new PrismaSessionStorage(prisma);

// Get app URL from environment variables
// DigitalOcean: Set SHOPIFY_APP_URL or HOST to your actual app URL after first deployment
// For initial deployment, uses a placeholder that allows the app to start
const getAppUrl = () => {
  // Check explicit environment variables first
  if (process.env.SHOPIFY_APP_URL) return process.env.SHOPIFY_APP_URL;
  if (process.env.HOST) return process.env.HOST;

  // DigitalOcean provides APP_URL in some cases
  if (process.env.APP_URL) return process.env.APP_URL;

  // For initial deployment, provide a valid placeholder URL
  // This allows the app to build and deploy, then you can update with actual URL
  console.warn("⚠️  No SHOPIFY_APP_URL or HOST set! Using placeholder URL.");
  console.warn("⚠️  Please set SHOPIFY_APP_URL in environment variables and redeploy.");
  return "https://placeholder.example.com";
};

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(","),
  appUrl: getAppUrl(),
  authPathPrefix: "/auth",
  sessionStorage: prismaSessionStorage,
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});

export default shopify;
export const apiVersion = LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

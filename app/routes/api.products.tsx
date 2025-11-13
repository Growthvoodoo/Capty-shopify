import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const apiKey = request.headers.get("x-capty-api-key");

  // Validate API key
  const CAPTY_API_KEY = process.env.CAPTY_API_KEY || "capty-secret-key";
  if (apiKey !== CAPTY_API_KEY) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    // Get session for this shop
    const sessionStorage = (global as any).shopify?.sessionStorage;
    if (!sessionStorage) {
      return json({ error: "Session storage not available" }, { status: 500 });
    }

    // Find session for this shop (we need the access token)
    const sessions = await sessionStorage.findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      return json({ error: "Shop not installed" }, { status: 404 });
    }

    const session = sessions[0];

    // Use ProductListing API to get products published to Capty sales channel
    const response = await fetch(
      `https://${shop}/admin/api/2025-01/product_listings.json`,
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const productListings = data.product_listings || [];

    // Get disc golf data from database
    const discGolfData = await prisma.discGolfProduct.findMany({
      where: { shop, isActive: true },
    });

    // Create a map of product disc golf data
    const discDataMap = new Map(
      discGolfData.map((d) => [d.productId, d])
    );

    // Transform to mobile app format with disc golf data structure
    const products = productListings.map((listing: any) => {
      const productId = listing.product_id.toString();
      const discData = discDataMap.get(productId);

      // Extract image URLs
      const mediaUrls = (listing.images || []).map((img: any) => img.src);

      return {
        name: discData?.name || listing.title,
        disc_brand_id: discData?.discBrandId || 1,
        speed: discData?.speed || 12.3,
        glide: discData?.glide || 8.3,
        turn: discData?.turn || 7.2,
        fade: discData?.fade || 4.5,
        description: discData?.description || listing.body_html || listing.title,
        medias: mediaUrls,
        type: discData?.type || "Round",
        is_active: discData?.isActive !== false,
        tags: discData?.tags ? JSON.parse(discData.tags) : [24],
      };
    });

    return json(
      {
        success: true,
        shop,
        products,
        total: products.length,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-capty-api-key",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching products for mobile app:", error);
    return json(
      { error: "Failed to fetch products" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-capty-api-key",
        },
      }
    );
  }
};

// Handle OPTIONS request for CORS preflight
export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-capty-api-key",
    },
  });
};

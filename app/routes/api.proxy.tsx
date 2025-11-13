import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const captyClickId = url.searchParams.get("capty_click_id");
  const captyUserId = url.searchParams.get("capty_user_id");
  const productHandle = url.searchParams.get("product");
  const productId = url.searchParams.get("product_id");
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  // Track the click in database
  if (captyClickId) {
    try {
      await prisma.captyClick.create({
        data: {
          shop,
          captyClickId,
          captyUserId,
          productId,
          productHandle,
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
          userAgent: request.headers.get("user-agent") || "",
        },
      });
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  }

  // Build redirect URL
  const shopDomain = shop.replace(".myshopify.com", "");
  let redirectUrl = `https://${shop}`;

  if (productHandle) {
    redirectUrl += `/products/${productHandle}`;
  } else if (productId) {
    redirectUrl += `/products/${productId}`;
  }

  // Add cart attribute to URL for ScriptTag to capture
  if (captyClickId) {
    redirectUrl += `?capty_click_id=${captyClickId}`;
    if (captyUserId) {
      redirectUrl += `&capty_user_id=${captyUserId}`;
    }
  }

  return redirect(redirectUrl, 302);
};

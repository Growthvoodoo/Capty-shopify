import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    // Get all disc golf products from database
    const discGolfProducts = await prisma.discGolfProduct.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
    });

    // Fetch product listings to get full product info
    const response = await fetch(
      `https://${session.shop}/admin/api/2025-01/product_listings.json`,
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const productListings = data.product_listings || [];

    // Create a map of product listings
    const listingsMap = new Map(
      productListings.map((p: any) => [p.product_id.toString(), p])
    );

    // Combine disc golf data with product listings
    const combinedData = discGolfProducts.map((disc) => {
      const listing = listingsMap.get(disc.productId);
      const mediaUrls = listing?.images?.map((img: any) => img.src) || [];

      return {
        name: disc.name,
        disc_brand_id: disc.discBrandId,
        speed: disc.speed,
        glide: disc.glide,
        turn: disc.turn,
        fade: disc.fade,
        description: disc.description,
        medias: mediaUrls,
        type: disc.type,
        is_active: disc.isActive,
        tags: JSON.parse(disc.tags),
      };
    });

    return json({
      shop: session.shop,
      discGolfProducts: combinedData,
      apiUrl: `${new URL(request.url).origin}/api/products?shop=${session.shop}`,
      apiKey: process.env.CAPTY_API_KEY,
    });
  } catch (error: any) {
    console.error("Error fetching disc golf data:", error);
    return json({
      shop: session.shop,
      discGolfProducts: [],
      error: error.message,
      apiUrl: "",
      apiKey: "",
    });
  }
};

export default function ViewData() {
  const { shop, discGolfProducts, apiUrl, apiKey, error } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="View Disc Golf Data" />
      <BlockStack gap="500">
        <Layout>
          {error && (
            <Layout.Section>
              <Banner tone="critical">
                <Text as="p">Error: {error}</Text>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  API Endpoint for Mobile App
                </Text>
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  URL:
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {apiUrl}
                </Text>
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  Header:
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  x-capty-api-key: {apiKey}
                </Text>
                <Banner tone="info">
                  <Text as="p" variant="bodySm">
                    The mobile app developer should use this endpoint to fetch products.
                  </Text>
                </Banner>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Stored Disc Golf Data ({discGolfProducts.length} products)
                </Text>
                {discGolfProducts.length === 0 ? (
                  <Banner tone="info">
                    <Text as="p" variant="bodyMd">
                      No disc golf data saved yet. Go to "Published to Capty" and click "Edit Disc Data" to add specifications.
                    </Text>
                  </Banner>
                ) : (
                  <BlockStack gap="400">
                    {discGolfProducts.map((product: any, index: number) => (
                      <Card key={index}>
                        <BlockStack gap="300">
                          <Text as="h3" variant="headingSm" fontWeight="bold">
                            {product.name}
                          </Text>
                          <div style={{
                            background: '#f6f6f7',
                            padding: '12px',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            overflow: 'auto'
                          }}>
                            <pre>{JSON.stringify(product, null, 2)}</pre>
                          </div>
                        </BlockStack>
                      </Card>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Test the API
                </Text>
                <Text as="p" variant="bodyMd">
                  You can test the API using curl:
                </Text>
                <div style={{
                  background: '#f6f6f7',
                  padding: '12px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  <pre>{`curl -H "x-capty-api-key: ${apiKey}" "${apiUrl}"`}</pre>
                </div>
                <Text as="p" variant="bodyMd">
                  Or open this in your browser (API key in header required):
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {apiUrl}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

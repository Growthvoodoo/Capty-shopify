import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Banner,
  Text,
  DataTable,
  InlineStack,
  Modal,
  TextField,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState, useEffect } from "react";
import { ClientOnly } from "../components/ClientOnly";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Use ProductListing API to get products published to Capty sales channel
    // This is the correct way for sales channel apps
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

    // Transform to match our format
    const publishedProducts = productListings.map((listing: any) => ({
      id: listing.product_id,
      productId: `gid://shopify/Product/${listing.product_id}`,
      productTitle: listing.title,
      productHandle: listing.handle,
      publishedAt: listing.published_at || new Date().toISOString(),
      variants: listing.variants || [],
    }));

    return json({ publishedProducts, shop: session.shop });
  } catch (error) {
    console.error("Error fetching product listings:", error);
    return json({ publishedProducts: [], shop: session.shop });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "saveDiscData") {
    try {
      const productId = formData.get("productId") as string;
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const medias = formData.get("medias") as string; // JSON string
      const discBrandId = parseInt(formData.get("discBrandId") as string) || 1;
      const speed = parseFloat(formData.get("speed") as string) || 12.3;
      const glide = parseFloat(formData.get("glide") as string) || 8.3;
      const turn = parseFloat(formData.get("turn") as string) || 7.2;
      const fade = parseFloat(formData.get("fade") as string) || 4.5;
      const type = (formData.get("type") as string) || "Round";
      const isActive = formData.get("isActive") === "true";

      await prisma.discGolfProduct.upsert({
        where: {
          shop_productId: {
            shop: session.shop,
            productId,
          },
        },
        update: {
          name,
          discBrandId,
          speed,
          glide,
          turn,
          fade,
          description,
          medias,
          type,
          isActive,
        },
        create: {
          shop: session.shop,
          productId,
          name,
          discBrandId,
          speed,
          glide,
          turn,
          fade,
          description,
          medias,
          type,
          isActive,
        },
      });

      return json({ success: true, message: "Disc golf data saved successfully!" });
    } catch (error: any) {
      console.error("Error saving disc data:", error);
      return json({ error: error.message }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function Publications() {
  const { publishedProducts } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [editModalActive, setEditModalActive] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);

  const handleEditDisc = (product: any) => {
    setCurrentProduct(product);
    setEditModalActive(true);
  };

  const handleSaveDiscData = (product: any, data: any) => {
    // Get product images
    const medias = product.variants?.[0]?.image_id
      ? [product.variants[0].image_id]
      : [];

    const formData = new FormData();
    formData.append("action", "saveDiscData");
    formData.append("productId", product.id.toString());
    formData.append("name", product.productTitle);
    formData.append("description", product.productTitle); // Will be fetched from full product data
    formData.append("medias", JSON.stringify(medias));
    formData.append("discBrandId", data.disc_brand_id.toString());
    formData.append("speed", data.speed.toString());
    formData.append("glide", data.glide.toString());
    formData.append("turn", data.turn.toString());
    formData.append("fade", data.fade.toString());
    formData.append("type", data.type);
    formData.append("isActive", "true");

    submit(formData, { method: "post" });
    setEditModalActive(false);
  };

  const rows = publishedProducts.map((product: any) => [
    product.productTitle,
    product.productHandle,
    new Date(product.publishedAt).toLocaleDateString(),
    product.variants?.length || 0,
    <Button key={product.id} size="slim" onClick={() => handleEditDisc(product)}>
      Edit Disc Data
    </Button>,
  ]);

  return (
    <Page>
      <TitleBar title="Capty Sales Channel" />
      <ClientOnly>
        <BlockStack gap="500">
          <Layout>
            {actionData && "error" in actionData && (
              <Layout.Section>
                <Banner tone="critical" title="Error">
                  <p>{actionData.error}</p>
                </Banner>
              </Layout.Section>
            )}

            {actionData && "success" in actionData && (
              <Layout.Section>
                <Banner tone="success">
                  {actionData.message}
                </Banner>
              </Layout.Section>
            )}

            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Products Published to Capty
                  </Text>

                  {publishedProducts.length === 0 ? (
                    <Banner tone="info">
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">
                          No products published to Capty yet.
                        </Text>
                        <Text as="p" variant="bodySm">
                          To publish products: Go to Products in Shopify admin → Select a product → In the Publishing section, toggle "Capty" ON
                        </Text>
                      </BlockStack>
                    </Banner>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "text", "numeric", "text"]}
                      headings={["Product", "Handle", "Published Date", "Variants", "Actions"]}
                      rows={rows}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    How it Works
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Products you publish to Capty will be available on the Capty mobile app for disc golf enthusiasts to discover and purchase.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    When a user purchases through Capty, a 10% commission is calculated on the order total.
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>

          {currentProduct && (
            <DiscDataModal
              product={currentProduct}
              active={editModalActive}
              onClose={() => setEditModalActive(false)}
              onSave={(data) => handleSaveDiscData(currentProduct, data)}
            />
          )}
        </BlockStack>
      </ClientOnly>
    </Page>
  );
}

function DiscDataModal({ product, active, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    disc_brand_id: 1,
    speed: 12.3,
    glide: 8.3,
    turn: 7.2,
    fade: 4.5,
    type: "Round",
    is_active: true,
    tags: [24],
  });

  const handleSave = () => {
    onSave(formData);
  };

  const typeOptions = [
    { label: "Round", value: "Round" },
    { label: "Driver", value: "Driver" },
    { label: "Mid-Range", value: "Mid-Range" },
    { label: "Putter", value: "Putter" },
  ];

  return (
    <Modal
      open={active}
      onClose={onClose}
      title={`Edit Disc Golf Data - ${product.productTitle}`}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd" tone="subdued">
            Enter disc golf specifications. Leave fields empty to use default values.
          </Text>

          <TextField
            label="Speed"
            type="number"
            value={formData.speed?.toString() || ""}
            onChange={(value) => setFormData({ ...formData, speed: parseFloat(value) || 12.3 })}
            autoComplete="off"
            helpText="Default: 12.3"
          />

          <TextField
            label="Glide"
            type="number"
            value={formData.glide?.toString() || ""}
            onChange={(value) => setFormData({ ...formData, glide: parseFloat(value) || 8.3 })}
            autoComplete="off"
            helpText="Default: 8.3"
          />

          <TextField
            label="Turn"
            type="number"
            value={formData.turn?.toString() || ""}
            onChange={(value) => setFormData({ ...formData, turn: parseFloat(value) || 7.2 })}
            autoComplete="off"
            helpText="Default: 7.2"
          />

          <TextField
            label="Fade"
            type="number"
            value={formData.fade?.toString() || ""}
            onChange={(value) => setFormData({ ...formData, fade: parseFloat(value) || 4.5 })}
            autoComplete="off"
            helpText="Default: 4.5"
          />

          <Select
            label="Type"
            options={typeOptions}
            value={formData.type || "Round"}
            onChange={(value) => setFormData({ ...formData, type: value })}
          />

          <TextField
            label="Disc Brand ID"
            type="number"
            value={formData.disc_brand_id?.toString() || ""}
            onChange={(value) => setFormData({ ...formData, disc_brand_id: parseInt(value) || 1 })}
            autoComplete="off"
            helpText="Default: 1"
          />

          <Banner tone="info">
            <Text as="p" variant="bodySm">
              Product name, description, and images will be automatically included from Shopify data.
            </Text>
          </Banner>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Banner,
  InlineStack,
  Modal,
  TextField,
  DataTable,
  Divider,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";
import { ClientOnly } from "../components/ClientOnly";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "fetchProducts" || action === "fetchProductsByTag") {
    try {
      const tag = action === "fetchProductsByTag" ? formData.get("tag") : null;
      let allProducts: any[] = [];
      let hasNextPage = true;
      let cursor = null;

      // Fetch all products with pagination
      while (hasNextPage) {
        const query = tag
          ? `#graphql
            query getProducts($cursor: String, $tag: String!) {
              products(first: 50, after: $cursor, query: $tag) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    id
                    title
                    description
                    status
                    totalInventory
                    priceRangeV2 {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    images(first: 1) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                    variants(first: 10) {
                      edges {
                        node {
                          id
                          title
                          price
                          inventoryQuantity
                        }
                      }
                    }
                  }
                }
              }
            }`
          : `#graphql
            query getProducts($cursor: String) {
              products(first: 50, after: $cursor) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    id
                    title
                    description
                    status
                    totalInventory
                    priceRangeV2 {
                      minVariantPrice {
                        amount
                        currencyCode
                      }
                    }
                    images(first: 1) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                    variants(first: 10) {
                      edges {
                        node {
                          id
                          title
                          price
                          inventoryQuantity
                        }
                      }
                    }
                  }
                }
              }
            }`;

        const variables = tag
          ? { cursor, tag: `tag:${tag}` }
          : { cursor };

        const response = await admin.graphql(query, { variables });
        const data: any = await response.json();

        const products = data?.data?.products?.edges?.map((edge: any) => edge.node) || [];
        allProducts = [...allProducts, ...products];

        hasNextPage = data?.data?.products?.pageInfo?.hasNextPage || false;
        cursor = data?.data?.products?.pageInfo?.endCursor || null;
      }

      return json({ products: allProducts, success: true, tag: tag || null });
    } catch (error) {
      return json({ error: "Failed to fetch products" }, { status: 500 });
    }
  }

  // Publishing is now handled in Shopify admin via the Capty sales channel

  if (action === "analyzeImage") {
    const imageUrl = formData.get("imageUrl");
    // This would be handled by the client-side using Claude or another AI service
    return json({ success: true });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function Index() {
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [products, setProducts] = useState<any[]>([]);
  const [editModalActive, setEditModalActive] = useState(false);
  const [currentEditProduct, setCurrentEditProduct] = useState<any>(null);
  const [editedProduct, setEditedProduct] = useState<any>(null);
  const [tagInput, setTagInput] = useState("");
  const [analyzingImage, setAnalyzingImage] = useState<string | null>(null);
  const [aiExtractedData, setAiExtractedData] = useState<any>({});

  // Sync products state with fetched data
  useEffect(() => {
    if (actionData && 'products' in actionData) {
      setProducts(actionData.products as any[]);
    }
  }, [actionData]);

  const handleFetchProducts = () => {
    const formData = new FormData();
    formData.append("action", "fetchProducts");
    submit(formData, { method: "post" });
  };

  const handleFetchByTag = () => {
    if (!tagInput.trim()) {
      alert("Please enter a tag");
      return;
    }
    const formData = new FormData();
    formData.append("action", "fetchProductsByTag");
    formData.append("tag", tagInput.trim());
    submit(formData, { method: "post" });
  };

  const productsData = products;

  const handleEditProduct = (product: any) => {
    setCurrentEditProduct(product);
    const aiData = aiExtractedData[product.id] || {};
    setEditedProduct({
      ...product,
      variants: product.variants?.edges?.map((edge: any) => edge.node) || product.variants || [],
      aiExtracted: aiData
    });
    setEditModalActive(true);
  };

  const handleSaveEdit = () => {
    // Save AI extracted data
    if (editedProduct.aiExtracted) {
      setAiExtractedData((prev: any) => ({
        ...prev,
        [editedProduct.id]: editedProduct.aiExtracted
      }));
    }

    // Save edited product to products state
    const updatedProducts = productsData.map((p: any) =>
      p.id === editedProduct.id ? {
        ...editedProduct,
        variants: {
          edges: editedProduct.variants.map((v: any) => ({ node: v }))
        },
        aiExtracted: editedProduct.aiExtracted
      } : p
    );
    setProducts(updatedProducts);
    setEditModalActive(false);
    setCurrentEditProduct(null);
  };

  const handleAddToCapty = (product: any) => {
    // Save to localStorage
    const savedProducts = JSON.parse(localStorage.getItem('captyProducts') || '[]');
    const aiData = aiExtractedData[product.id] || {};
    const productToSave = {
      ...product,
      variants: product.variants?.edges?.map((edge: any) => edge.node) || product.variants || [],
      images: product.images?.edges?.map((edge: any) => edge.node) || [],
      aiExtracted: aiData,
      savedAt: new Date().toISOString()
    };
    savedProducts.push(productToSave);
    localStorage.setItem('captyProducts', JSON.stringify(savedProducts));

    // Also publish to database
    const variantIds = product.variants?.edges?.map((edge: any) => edge.node.id) || [];
    const formData = new FormData();
    formData.append("action", "publishToCapty");
    formData.append("productId", product.id);
    formData.append("productTitle", product.title);
    formData.append("productHandle", product.handle || product.id);
    formData.append("variantIds", JSON.stringify(variantIds));
    submit(formData, { method: "post" });

    alert(`${product.title} published to Capty app!`);
  };

  const handleAddAllToCapty = () => {
    const savedProducts = JSON.parse(localStorage.getItem('captyProducts') || '[]');
    const productsToSave = productsData.map((product: any) => {
      const aiData = aiExtractedData[product.id] || {};
      return {
        ...product,
        variants: product.variants?.edges?.map((edge: any) => edge.node) || product.variants || [],
        images: product.images?.edges?.map((edge: any) => edge.node) || [],
        aiExtracted: aiData,
        savedAt: new Date().toISOString()
      };
    });
    const allProducts = [...savedProducts, ...productsToSave];
    localStorage.setItem('captyProducts', JSON.stringify(allProducts));
    alert(`All ${productsData.length} products added to Capty app!`);
  };

  const analyzeProductImage = async (product: any) => {
    const imageUrl = product.images?.edges?.[0]?.node?.url;
    if (!imageUrl) {
      alert("No image available for this product");
      return;
    }

    setAnalyzingImage(product.id);

    // Simulated AI analysis - In production, this would call an AI API
    // For now, we'll try to extract info from the product title and description
    setTimeout(() => {
      const extractedData = {
        brand: extractBrandFromText(product.title, product.description),
        model: extractModelFromText(product.title),
        type: extractTypeFromText(product.title, product.description),
        plastic: extractPlasticFromText(product.title, product.description),
      };

      setAiExtractedData((prev: any) => ({
        ...prev,
        [product.id]: extractedData
      }));

      // Update the product with extracted data
      const updatedProducts = products.map((p: any) =>
        p.id === product.id ? { ...p, aiExtracted: extractedData } : p
      );
      setProducts(updatedProducts);

      setAnalyzingImage(null);
      alert(`AI Analysis Complete!\nBrand: ${extractedData.brand}\nModel: ${extractedData.model}\nType: ${extractedData.type}\nPlastic: ${extractedData.plastic}`);
    }, 2000);
  };

  // Helper functions to extract disc golf info
  const extractBrandFromText = (title: string, description: string = "") => {
    const brands = ["Innova", "Discraft", "Dynamic Discs", "Latitude 64", "Westside", "MVP", "Axiom", "Discmania", "Prodigy", "Gateway"];
    const text = `${title} ${description}`.toLowerCase();
    for (const brand of brands) {
      if (text.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    return "Unknown";
  };

  const extractModelFromText = (title: string) => {
    // Try to extract model name (usually capitalized word after brand)
    const words = title.split(" ");
    for (const word of words) {
      if (word.length > 2 && word[0] === word[0].toUpperCase()) {
        return word;
      }
    }
    return "Unknown";
  };

  const extractTypeFromText = (title: string, description: string = "") => {
    const types = ["Driver", "Mid-Range", "Midrange", "Putter", "Fairway", "Distance"];
    const text = `${title} ${description}`.toLowerCase();
    for (const type of types) {
      if (text.includes(type.toLowerCase())) {
        return type;
      }
    }
    return "Unknown";
  };

  const extractPlasticFromText = (title: string, description: string = "") => {
    const plastics = ["Star", "Champion", "DX", "Pro", "GStar", "XT", "R-Pro", "ESP", "Z", "Big Z", "Titanium", "Lucid", "Fuzion", "Prime", "Classic", "Neutron", "Plasma", "Proton"];
    const text = `${title} ${description}`.toLowerCase();
    for (const plastic of plastics) {
      if (text.includes(plastic.toLowerCase())) {
        return plastic;
      }
    }
    return "Unknown";
  };

  return (
    <Page>
      <TitleBar title="Capty - Disc Golf Product Manager" />
      <ClientOnly>
        <BlockStack gap="500">
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Product Fetcher
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Fetch all products or filter by tag
                  </Text>
                  <InlineStack gap="300" wrap={false}>
                    <Button variant="primary" onClick={handleFetchProducts}>
                      Fetch All Products
                    </Button>
                    <TextField
                      label=""
                      value={tagInput}
                      onChange={setTagInput}
                      placeholder="Enter tag (e.g., disc-golf)"
                      autoComplete="off"
                    />
                    <Button onClick={handleFetchByTag}>
                      Fetch with Tag
                    </Button>
                    {productsData && productsData.length > 0 && (
                      <Button onClick={handleAddAllToCapty}>
                        Add all to Capty app
                      </Button>
                    )}
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>

            {actionData && 'error' in actionData && (
              <Layout.Section>
                <Banner tone="critical" title="Error">
                  <p>{actionData.error}</p>
                </Banner>
              </Layout.Section>
            )}

            {actionData && 'success' in actionData && actionData.success && (
              <Layout.Section>
                <Banner tone="success">
                  Successfully fetched {productsData?.length || 0} products!
                </Banner>
              </Layout.Section>
            )}

            {productsData && productsData.length > 0 && (
              <Layout.Section>
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Products ({productsData.length})
                    </Text>
                    {productsData.map((product: any) => {
                      const imageUrl = product.images?.edges?.[0]?.node?.url;
                      const aiData = aiExtractedData[product.id];

                      return (
                        <Card key={product.id}>
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="start">
                              <InlineStack gap="300" blockAlign="start">
                                {imageUrl && (
                                  <Thumbnail
                                    source={imageUrl}
                                    alt={product.title}
                                    size="large"
                                  />
                                )}
                                <BlockStack gap="200">
                                  <Text as="h3" variant="headingSm" fontWeight="bold">
                                    {product.title}
                                  </Text>
                                  {aiData && (
                                    <BlockStack gap="100">
                                      <Text as="p" variant="bodySm" tone="success">
                                        <strong>AI Extracted:</strong> Brand: {aiData.brand} | Model: {aiData.model} | Type: {aiData.type} | Plastic: {aiData.plastic}
                                      </Text>
                                    </BlockStack>
                                  )}
                                </BlockStack>
                              </InlineStack>
                              <InlineStack gap="200">
                                {imageUrl && (
                                  <Button
                                    size="slim"
                                    onClick={() => analyzeProductImage(product)}
                                    loading={analyzingImage === product.id}
                                  >
                                    Analyze with AI
                                  </Button>
                                )}
                                <Button size="slim" onClick={() => handleEditProduct(product)}>
                                  Edit
                                </Button>
                              </InlineStack>
                            </InlineStack>

                            {product.description && (
                              <Text as="p" variant="bodyMd" tone="subdued">
                                {product.description}
                              </Text>
                            )}

                            <InlineStack gap="400">
                              <Text as="p" variant="bodySm">
                                <strong>Status:</strong> {product.status}
                              </Text>
                              <Text as="p" variant="bodySm">
                                <strong>Inventory:</strong> {product.totalInventory}
                              </Text>
                              <Text as="p" variant="bodySm">
                                <strong>Price:</strong> ${product.priceRangeV2.minVariantPrice.amount} {product.priceRangeV2.minVariantPrice.currencyCode}
                              </Text>
                            </InlineStack>

                            {product.variants?.edges && product.variants.edges.length > 0 && (
                              <>
                                <Divider />
                                <BlockStack gap="200">
                                  <Text as="h4" variant="headingXs" fontWeight="semibold">
                                    Variants ({product.variants.edges.length})
                                  </Text>
                                  <DataTable
                                    columnContentTypes={['text', 'text', 'numeric']}
                                    headings={['Variant', 'Price', 'Inventory']}
                                    rows={product.variants.edges.map((edge: any) => [
                                      edge.node.title,
                                      `$${edge.node.price}`,
                                      edge.node.inventoryQuantity || 0
                                    ])}
                                  />
                                </BlockStack>
                              </>
                            )}
                          </BlockStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                </Card>
              </Layout.Section>
            )}
          </Layout>
        </BlockStack>
      </ClientOnly>

      {editedProduct && (
        <Modal
          open={editModalActive}
          onClose={() => setEditModalActive(false)}
          title={`Edit: ${currentEditProduct?.title}`}
          primaryAction={{
            content: 'Save',
            onAction: handleSaveEdit,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setEditModalActive(false),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Title"
                value={editedProduct.title}
                onChange={(value) => setEditedProduct({ ...editedProduct, title: value })}
                autoComplete="off"
              />

              <TextField
                label="Description"
                value={editedProduct.description || ''}
                onChange={(value) => setEditedProduct({ ...editedProduct, description: value })}
                multiline={4}
                autoComplete="off"
              />

              <TextField
                label="Total Inventory"
                type="number"
                value={editedProduct.totalInventory?.toString() || '0'}
                onChange={(value) => setEditedProduct({ ...editedProduct, totalInventory: parseInt(value) || 0 })}
                autoComplete="off"
              />

              <TextField
                label="Price"
                type="number"
                value={editedProduct.priceRangeV2?.minVariantPrice?.amount || '0'}
                onChange={(value) => setEditedProduct({
                  ...editedProduct,
                  priceRangeV2: {
                    ...editedProduct.priceRangeV2,
                    minVariantPrice: {
                      ...editedProduct.priceRangeV2.minVariantPrice,
                      amount: value
                    }
                  }
                })}
                prefix="$"
                autoComplete="off"
              />

              <Divider />

              <Text as="h3" variant="headingMd">
                Disc Golf Details (AI Extracted)
              </Text>

              <InlineStack gap="300">
                <TextField
                  label="Brand"
                  value={editedProduct.aiExtracted?.brand || ''}
                  onChange={(value) => setEditedProduct({
                    ...editedProduct,
                    aiExtracted: { ...editedProduct.aiExtracted, brand: value }
                  })}
                  autoComplete="off"
                />
                <TextField
                  label="Model"
                  value={editedProduct.aiExtracted?.model || ''}
                  onChange={(value) => setEditedProduct({
                    ...editedProduct,
                    aiExtracted: { ...editedProduct.aiExtracted, model: value }
                  })}
                  autoComplete="off"
                />
              </InlineStack>

              <InlineStack gap="300">
                <TextField
                  label="Type"
                  value={editedProduct.aiExtracted?.type || ''}
                  onChange={(value) => setEditedProduct({
                    ...editedProduct,
                    aiExtracted: { ...editedProduct.aiExtracted, type: value }
                  })}
                  autoComplete="off"
                />
                <TextField
                  label="Plastic"
                  value={editedProduct.aiExtracted?.plastic || ''}
                  onChange={(value) => setEditedProduct({
                    ...editedProduct,
                    aiExtracted: { ...editedProduct.aiExtracted, plastic: value }
                  })}
                  autoComplete="off"
                />
              </InlineStack>

              {editedProduct.variants && editedProduct.variants.length > 0 && (
                <>
                  <Divider />
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      Variants
                    </Text>
                    {editedProduct.variants.map((variant: any, index: number) => (
                      <Card key={variant.id}>
                        <BlockStack gap="300">
                          <TextField
                            label="Variant Title"
                            value={variant.title}
                            onChange={(value) => {
                              const updatedVariants = [...editedProduct.variants];
                              updatedVariants[index] = { ...variant, title: value };
                              setEditedProduct({ ...editedProduct, variants: updatedVariants });
                            }}
                            autoComplete="off"
                          />
                          <InlineStack gap="300">
                            <TextField
                              label="Price"
                              type="number"
                              value={variant.price}
                              onChange={(value) => {
                                const updatedVariants = [...editedProduct.variants];
                                updatedVariants[index] = { ...variant, price: value };
                                setEditedProduct({ ...editedProduct, variants: updatedVariants });
                              }}
                              prefix="$"
                              autoComplete="off"
                            />
                            <TextField
                              label="Inventory"
                              type="number"
                              value={variant.inventoryQuantity?.toString() || '0'}
                              onChange={(value) => {
                                const updatedVariants = [...editedProduct.variants];
                                updatedVariants[index] = { ...variant, inventoryQuantity: parseInt(value) || 0 };
                                setEditedProduct({ ...editedProduct, variants: updatedVariants });
                              }}
                              autoComplete="off"
                            />
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    ))}
                  </BlockStack>
                </>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}

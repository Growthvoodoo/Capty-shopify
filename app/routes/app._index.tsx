import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState, useCallback } from "react";
import { ClientOnly } from "../components/ClientOnly";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "fetchProducts") {
    try {
      const response = await admin.graphql(
        `#graphql
        query getProducts {
          products(first: 10) {
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
                variants(first: 5) {
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
      );

      const data: any = await response.json();
      const products = data?.data?.products?.edges?.map((edge: any) => edge.node) || [];

      return json({ products, success: true });
    } catch (error) {
      return json({ error: "Failed to fetch products" }, { status: 500 });
    }
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

  const handleFetchProducts = () => {
    const formData = new FormData();
    formData.append("action", "fetchProducts");
    submit(formData, { method: "post" });
  };

  const productsData = actionData && 'products' in actionData ? actionData.products : products;

  const handleEditProduct = (product: any) => {
    setCurrentEditProduct(product);
    setEditedProduct({
      ...product,
      variants: product.variants?.edges?.map((edge: any) => edge.node) || []
    });
    setEditModalActive(true);
  };

  const handleSaveEdit = () => {
    // Save edited product to products state
    const updatedProducts = productsData.map((p: any) =>
      p.id === editedProduct.id ? editedProduct : p
    );
    setProducts(updatedProducts);
    setEditModalActive(false);
    setCurrentEditProduct(null);
  };

  const handleAddToCapty = (product: any) => {
    const savedProducts = JSON.parse(localStorage.getItem('captyProducts') || '[]');
    const productToSave = {
      ...product,
      variants: product.variants?.edges?.map((edge: any) => edge.node) || [],
      savedAt: new Date().toISOString()
    };
    savedProducts.push(productToSave);
    localStorage.setItem('captyProducts', JSON.stringify(savedProducts));
    alert(`${product.title} added to Capty app!`);
  };

  const handleAddAllToCapty = () => {
    const savedProducts = JSON.parse(localStorage.getItem('captyProducts') || '[]');
    const productsToSave = productsData.map((product: any) => ({
      ...product,
      variants: product.variants?.edges?.map((edge: any) => edge.node) || [],
      savedAt: new Date().toISOString()
    }));
    const allProducts = [...savedProducts, ...productsToSave];
    localStorage.setItem('captyProducts', JSON.stringify(allProducts));
    alert(`All ${productsData.length} products added to Capty app!`);
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
                    Click 'Fetch Products' to load products from your store
                  </Text>
                  <InlineStack gap="300">
                    <Button variant="primary" onClick={handleFetchProducts}>
                      Fetch Products
                    </Button>
                    {productsData && productsData.length > 0 && (
                      <Button onClick={handleAddAllToCapty}>
                        Add all on Capty app
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
                    {productsData.map((product: any) => (
                      <Card key={product.id}>
                        <BlockStack gap="300">
                          <InlineStack align="space-between">
                            <Text as="h3" variant="headingSm" fontWeight="bold">
                              {product.title}
                            </Text>
                            <InlineStack gap="200">
                              <Button size="slim" onClick={() => handleEditProduct(product)}>
                                Edit
                              </Button>
                              <Button size="slim" variant="primary" onClick={() => handleAddToCapty(product)}>
                                Add on Capty app
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
                    ))}
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

              {editedProduct.variants && editedProduct.variants.length > 0 && (
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
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}

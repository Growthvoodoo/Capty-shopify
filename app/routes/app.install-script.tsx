import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Banner,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "installScript") {
    try {
      // Check if script already exists
      const checkResponse = await admin.graphql(
        `#graphql
        query {
          scriptTags(first: 50) {
            edges {
              node {
                id
                src
              }
            }
          }
        }`
      );

      const checkData: any = await checkResponse.json();
      const scriptTags = checkData?.data?.scriptTags?.edges || [];

      // Check if our script is already installed
      const existingScript = scriptTags.find((edge: any) =>
        edge.node.src.includes('capty-tracking.js')
      );

      if (existingScript) {
        return json({
          success: false,
          message: "Script is already installed!"
        });
      }

      // Get the app URL
      const appUrl = process.env.SHOPIFY_APP_URL || `https://${request.headers.get('host')}`;

      // Install the script tag
      const response = await admin.graphql(
        `#graphql
        mutation scriptTagCreate($input: ScriptTagInput!) {
          scriptTagCreate(input: $input) {
            scriptTag {
              id
              src
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            input: {
              src: `${appUrl}/capty-tracking.js`,
              displayScope: "ONLINE_STORE",
            },
          },
        }
      );

      const data: any = await response.json();

      if (data?.data?.scriptTagCreate?.scriptTag) {
        return json({
          success: true,
          message: "Tracking script installed successfully! The script will now capture capty_click_id and capty_user_id from URLs.",
          scriptUrl: data.data.scriptTagCreate.scriptTag.src,
        });
      }

      const errors = data?.data?.scriptTagCreate?.userErrors || [];
      return json({
        success: false,
        error: errors.length > 0 ? errors[0].message : "Failed to install script",
      }, { status: 400 });

    } catch (error: any) {
      console.error("Error installing script:", error);
      return json({
        success: false,
        error: `Failed to install script: ${error.message}`,
      }, { status: 500 });
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function InstallScript() {
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const handleInstallScript = () => {
    const formData = new FormData();
    formData.append("action", "installScript");
    submit(formData, { method: "post" });
  };

  return (
    <Page>
      <TitleBar title="Install Tracking Script" />
      <BlockStack gap="500">
        <Layout>
          {actionData && "success" in actionData && actionData.success && (
            <Layout.Section>
              <Banner tone="success">
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">{actionData.message}</Text>
                  {actionData.scriptUrl && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Script URL: {actionData.scriptUrl}
                    </Text>
                  )}
                </BlockStack>
              </Banner>
            </Layout.Section>
          )}

          {actionData && "success" in actionData && !actionData.success && (
            <Layout.Section>
              <Banner tone="info">
                {actionData.message}
              </Banner>
            </Layout.Section>
          )}

          {actionData && "error" in actionData && (
            <Layout.Section>
              <Banner tone="critical">
                <Text as="p" variant="bodyMd">Error: {actionData.error}</Text>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Step 1: Install Tracking Script
                </Text>
                <Text as="p" variant="bodyMd">
                  The tracking script captures capty_click_id and capty_user_id from URL parameters and adds them to cart attributes.
                </Text>
                <Text as="p" variant="bodyMd">
                  Without this script, commission tracking will NOT work.
                </Text>
                <Button variant="primary" onClick={handleInstallScript}>
                  Install Tracking Script
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Step 2: Test with URL
                </Text>
                <Text as="p" variant="bodyMd">
                  After installing the script, use this test URL:
                </Text>
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  https://captydevstore.myshopify.com/products/dimension-fission-gyropalooza-2025?capty_click_id=MOBILE-CLICK-TEST-001&capty_user_id=mobile-user-456
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Click the link → Add to cart → Complete checkout → Check Commissions page
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  How It Works
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    1. User clicks disc in mobile app with tracking parameters
                  </Text>
                  <Text as="p" variant="bodyMd">
                    2. Tracking script captures parameters and stores in sessionStorage
                  </Text>
                  <Text as="p" variant="bodyMd">
                    3. When user adds to cart, script adds parameters as cart attributes
                  </Text>
                  <Text as="p" variant="bodyMd">
                    4. User completes checkout → Order created with attributes
                  </Text>
                  <Text as="p" variant="bodyMd">
                    5. Webhook fires → Commission calculated and saved
                  </Text>
                  <Text as="p" variant="bodyMd">
                    6. Commission appears in dashboard
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

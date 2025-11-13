import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  DataTable,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { ClientOnly } from "../components/ClientOnly";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Fetch commissions summary
  const commissions = await prisma.commission.findMany({
    where: {
      shop: session.shop,
    },
    orderBy: {
      month: "desc",
    },
  });

  // Fetch recent orders
  const recentOrders = await prisma.captyOrder.findMany({
    where: {
      shop: session.shop,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  // Calculate totals
  const totalCommissionOwed = commissions
    .filter((c) => !c.isPaid)
    .reduce((sum, c) => sum + c.totalCommission, 0);

  const totalCommissionPaid = commissions
    .filter((c) => c.isPaid)
    .reduce((sum, c) => sum + c.totalCommission, 0);

  return json({
    commissions,
    recentOrders,
    totalCommissionOwed,
    totalCommissionPaid,
  });
};

export default function Commissions() {
  const { commissions, recentOrders, totalCommissionOwed, totalCommissionPaid } =
    useLoaderData<typeof loader>();

  const commissionRows = commissions.map((commission) => [
    commission.month,
    commission.totalOrders,
    `$${commission.totalSales.toFixed(2)}`,
    `$${commission.totalCommission.toFixed(2)}`,
    commission.isPaid ? (
      <Badge tone="success">Paid</Badge>
    ) : (
      <Badge tone="warning">Pending</Badge>
    ),
    commission.paidAt ? new Date(commission.paidAt).toLocaleDateString() : "-",
  ]);

  const orderRows = recentOrders.map((order) => {
    // Generate Capty order reference
    const captyOrderRef = `CAPTY-${order.orderId}-${order.captyClickId?.substring(0, 8) || 'unknown'}`;

    return [
      order.orderName || order.orderId,
      order.captyUserId || "Guest",
      captyOrderRef,
      new Date(order.createdAt).toLocaleDateString(),
      `$${order.totalPrice.toFixed(2)}`,
      `$${order.commissionAmount.toFixed(2)}`,
      order.commissionPaid ? (
        <Badge tone="success">Paid</Badge>
      ) : (
        <Badge tone="warning">Unpaid</Badge>
      ),
    ];
  });

  return (
    <Page>
      <TitleBar title="Capty Commissions" />
      <ClientOnly>
        <BlockStack gap="500">
          <Layout>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Commission Owed
                  </Text>
                  <Text as="p" variant="headingLg">
                    ${totalCommissionOwed.toFixed(2)}
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Commission Paid
                  </Text>
                  <Text as="p" variant="headingLg">
                    ${totalCommissionPaid.toFixed(2)}
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Total Orders
                  </Text>
                  <Text as="p" variant="headingLg">
                    {recentOrders.length}
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Monthly Commission Summary
                  </Text>
                  {commissions.length === 0 ? (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No Capty orders yet. Products sold through Capty will appear here.
                    </Text>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric", "numeric", "text", "text"]}
                      headings={["Month", "Orders", "Sales", "Commission (10%)", "Status", "Paid Date"]}
                      rows={commissionRows}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Recent Capty Orders
                  </Text>
                  {recentOrders.length === 0 ? (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No Capty-referred orders yet.
                    </Text>
                  ) : (
                    <DataTable
                      columnContentTypes={["text", "text", "text", "text", "numeric", "numeric", "text"]}
                      headings={["Order", "User", "Capty Ref", "Date", "Order Total", "Commission", "Status"]}
                      rows={orderRows}
                    />
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    How Commissions Work
                  </Text>
                  <Text as="p" variant="bodyMd">
                    When a customer purchases through Capty, we automatically calculate a 10% commission on the order total.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Commissions are tracked monthly and will be settled at the end of each month.
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Payment methods: Stripe Connect (automatic) or Manual Invoice
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </ClientOnly>
    </Page>
  );
}

import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    throw new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      break;

    case "ORDERS_CREATE":
      try {
        const order = payload as any;

        console.log("=====================================");
        console.log("📦 ORDERS_CREATE Webhook Received");
        console.log(`Order ID: ${order.id}`);
        console.log(`Order Name: ${order.name}`);
        console.log(`Total Price: $${order.total_price}`);
        console.log(`Note Attributes:`, order.note_attributes);
        console.log("=====================================");

        const captyClickId = order.note_attributes?.find(
          (attr: any) => attr.name === "capty_click_id"
        )?.value;

        if (captyClickId) {
          console.log("✅ Found capty_click_id:", captyClickId);
          const captyUserId = order.note_attributes?.find(
            (attr: any) => attr.name === "capty_user_id"
          )?.value;

          const totalPrice = parseFloat(order.total_price || "0");
          const commissionAmount = totalPrice * 0.10;

          // Find which specific disc/product was clicked from the click record
          let clickedProductId = null;
          let clickedProductHandle = null;
          try {
            const clickRecord = await db.captyClick.findUnique({
              where: { captyClickId },
            });
            if (clickRecord) {
              clickedProductId = clickRecord.productId;
              clickedProductHandle = clickRecord.productHandle;
            }
          } catch (err) {
            console.log("Could not find click record:", err);
          }

          // Generate Capty-specific order reference
          const captyOrderRef = `CAPTY-${order.id}-${captyClickId.substring(0, 8)}`;

          // Save order with commission
          await db.captyOrder.create({
            data: {
              shop,
              orderId: order.id.toString(),
              orderName: order.name,
              captyClickId,
              captyUserId,
              totalPrice,
              currencyCode: order.currency || "USD",
              commissionAmount,
              commissionRate: 0.10,
              orderStatus: order.financial_status || "pending",
            },
          });

          console.log(`✅ Capty Order: ${captyOrderRef}`);
          console.log(`   User: ${captyUserId || 'unknown'}`);
          console.log(`   Clicked Disc: ${clickedProductHandle || clickedProductId || 'unknown'}`);
          console.log(`   Commission: $${commissionAmount.toFixed(2)}`);

          // Update monthly commission summary
          const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
          const existingCommission = await db.commission.findUnique({
            where: {
              shop_month: {
                shop,
                month,
              },
            },
          });

          if (existingCommission) {
            await db.commission.update({
              where: {
                shop_month: {
                  shop,
                  month,
                },
              },
              data: {
                totalOrders: existingCommission.totalOrders + 1,
                totalSales: existingCommission.totalSales + totalPrice,
                totalCommission: existingCommission.totalCommission + commissionAmount,
              },
            });
          } else {
            await db.commission.create({
              data: {
                shop,
                month,
                totalOrders: 1,
                totalSales: totalPrice,
                totalCommission: commissionAmount,
              },
            });
          }
        } else {
          console.log("❌ No capty_click_id found in order attributes");
          console.log("   This means:");
          console.log("   1. Tracking script is not installed, OR");
          console.log("   2. Customer didn't use a tracking URL, OR");
          console.log("   3. Script didn't capture the parameters");
        }
      } catch (error) {
        console.error("Error tracking Capty commission:", error);
      }
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};

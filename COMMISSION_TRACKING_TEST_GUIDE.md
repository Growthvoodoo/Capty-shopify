# Commission Tracking Test Guide

## Prerequisites

Your app must be deployed and running. Local development mode may have issues with webhooks.

## Step-by-Step Testing Process

### Step 1: Check Script Installation Status

1. Open your deployed Capty app in Shopify Admin
2. Click **"Script Status"** in the navigation
3. You will see one of two messages:
   - ✅ **"Tracking script IS installed"** - Proceed to Step 3
   - ❌ **"Tracking script is NOT installed"** - Continue to Step 2

### Step 2: Install the Tracking Script

If the script is NOT installed:

1. Click **"Install Script"** in the navigation
2. Click the **"Install Tracking Script"** button
3. Wait for the success message
4. Go back to **"Script Status"** to confirm it's now installed

### Step 3: Prepare Test URL

The mobile app will send users to your store with tracking parameters. To test this:

**Test URL Format:**
```
https://captydevstore.myshopify.com/products/YOUR-PRODUCT-HANDLE?capty_click_id=TEST-CLICK-123&capty_user_id=test-user-456
```

**Example with real product:**
```
https://captydevstore.myshopify.com/products/dimension-fission-gyropalooza-2025?capty_click_id=MOBILE-CLICK-2025-TEST-001&capty_user_id=mobile-user-456
```

You can also use the `test-tracking-link.html` file in your project root.

### Step 4: Test the Tracking

1. **Open the test URL** in a new browser window/tab
2. **Open Browser Console** (Press F12, then go to Console tab)
3. **Look for this message:**
   ```
   Capty tracking added to cart: MOBILE-CLICK-2025-TEST-001
   ```
   - ✅ If you see it: Script is working! Continue to next step
   - ❌ If you don't: Script may not be installed correctly

4. **Add the product to cart**

5. **Verify cart has tracking data:**
   - Open: `https://captydevstore.myshopify.com/cart.json`
   - Look for this in the JSON:
   ```json
   "attributes": {
     "capty_click_id": "MOBILE-CLICK-2025-TEST-001",
     "capty_user_id": "mobile-user-456"
   }
   ```

6. **Complete the checkout**
   - Fill in test customer info
   - Use Shopify's test payment (Bogus Gateway if in dev store)
   - Complete the order

### Step 5: Verify Commission Was Tracked

#### Option A: Check Debug Page

1. Go to **"Debug"** page in your Capty app
2. Look at **"Orders with Commissions"** table
3. You should see your test order with:
   - Order name/number
   - Click ID (MOBILE-CLICK-2025-TEST-001...)
   - Total price
   - Commission amount (10% of total)

#### Option B: Check Commissions Dashboard

1. Go to **"Commissions"** page
2. Check **Monthly Commission Summary** - should show:
   - Total Orders: 1 (or more)
   - Total Sales: Your order amount
   - Total Commission: 10% of sales
3. Check **Recent Orders** table - should show your order with:
   - Order number
   - User ID (mobile-user-456)
   - Capty Ref (CAPTY-{orderId}-{clickId})
   - Commission amount

### Step 6: Check Webhook Logs (If Deployed)

If you have access to your deployment logs:

1. Look for these console messages:
   ```
   =====================================
   📦 ORDERS_CREATE Webhook Received
   Order ID: 12345678
   Order Name: #1001
   Total Price: $100.00
   Note Attributes: [...]
   =====================================
   ✅ Found capty_click_id: MOBILE-CLICK-2025-TEST-001
   ✅ Capty Order: CAPTY-12345678-MOBILE-CL
      User: mobile-user-456
      Clicked Disc: dimension-fission-gyropalooza-2025
      Commission: $10.00
   ```

2. If you see:
   ```
   ❌ No capty_click_id found in order attributes
   ```
   This means the tracking script didn't add the attributes to the cart properly.

## Troubleshooting

### Problem: No console message "Capty tracking added to cart"

**Cause:** Script not installed or not loading

**Solution:**
1. Go to "Script Status" page - verify script is installed
2. Check browser console for JavaScript errors
3. Try reinstalling the script

### Problem: Cart doesn't have tracking attributes

**Cause:** Script loaded but didn't execute properly

**Solution:**
1. Clear browser cache and cookies
2. Try in incognito/private browsing mode
3. Make sure you're visiting the URL with parameters first before adding to cart

### Problem: Order created but no commission tracked

**Cause:** Webhook received order but no tracking attributes

**Solution:**
1. Check webhook logs for "❌ No capty_click_id found"
2. Verify the order in Shopify Admin:
   - Go to Orders → Your order → Additional details
   - Look for "capty_click_id" in custom attributes
3. If attributes are missing, the cart didn't have them before checkout

### Problem: "Order not found" when checking order

**Cause:** Protected customer data permission issue OR wrong order ID format

**Solution:**
1. **Don't use this page** - Use the Debug page instead
2. Debug page shows order data from the database, not from Shopify API
3. If you need to use Check Order page, enter the numeric order ID (e.g., `5001234567`), not the order name (e.g., `#1001`)

## Testing Checklist

- [ ] Script Status page shows ✅ "Tracking script IS installed"
- [ ] Opened test URL with capty_click_id and capty_user_id parameters
- [ ] Browser console shows "Capty tracking added to cart"
- [ ] /cart.json shows capty_click_id in attributes
- [ ] Completed checkout successfully
- [ ] Debug page shows the order in "Orders with Commissions"
- [ ] Commissions page shows the order with correct commission amount
- [ ] Monthly summary updated with order total and commission

## Important Notes

1. **Always install the script first** before testing
2. **Use fresh test orders** - Don't reuse old orders from before script was installed
3. **Check Debug page, not Check Order page** - It's more reliable
4. **Webhooks work best on deployed apps** - Local testing may have webhook delivery issues
5. **Each test should use a unique capty_click_id** - This helps track individual tests

## Mobile App Integration

When you integrate with the mobile app:

1. **Mobile app generates unique click IDs** for each disc click
2. **URL format:** `https://YOUR-STORE.myshopify.com/products/HANDLE?capty_click_id=UNIQUE-ID&capty_user_id=USER-ID`
3. **Commission calculation:** Automatic 10% of order total
4. **Commission tracking:** Webhook captures on order creation
5. **Dashboard displays:** User ID and Capty Order Reference for each commission

# Capty Commission Tracking System - Complete Guide

## Overview

This Shopify app implements a complete affiliate/commission tracking system for the Capty disc golf marketplace. When users purchase products through the Capty mobile app, stores pay a 10% commission on those sales.

## How It Works

### 1. Product Publication Flow

```
Store Admin → Fetch Products → Click "Add to Capty app" → Product Published to Capty Sales Channel
```

**What Happens:**
- Product is saved to `ProductPublication` table in database
- Product becomes available to Capty mobile app via API
- Product can be viewed in `/app/publications` page

### 2. Click Tracking Flow

```
Capty Mobile App → Generates Click → User Clicks Product
  ↓
Store Proxy URL: /a/capty?capty_click_id=xxx&product=handle&shop=store.myshopify.com
  ↓
App Proxy Route: /api/proxy
  ↓
1. Saves click to `CaptyClick` table
2. Redirects to product page with capty_click_id parameter
  ↓
JavaScript Tracking Script (capty-tracking.js)
  ↓
1. Captures capty_click_id from URL
2. Stores in sessionStorage
3. Injects into cart attributes via Shopify Cart API
```

### 3. Order & Commission Tracking Flow

```
User Completes Purchase
  ↓
Shopify fires ORDERS_CREATE webhook
  ↓
Webhook Handler (/webhooks)
  ↓
1. Extracts capty_click_id from order.note_attributes
2. Calculates 10% commission
3. Saves to `CaptyOrder` table
4. Updates monthly `Commission` summary
```

### 4. Commission Dashboard

Stores can view their Capty-generated sales and commissions at `/app/commissions`

## Database Schema

### ProductPublication
```typescript
{
  id: uuid
  shop: string
  productId: string
  productTitle: string
  productHandle: string
  variantIds: JSON string array
  publishedAt: DateTime
  isPublished: boolean
}
```

### CaptyClick
```typescript
{
  id: uuid
  shop: string
  captyClickId: string (unique)
  captyUserId: string
  productId: string
  productHandle: string
  ipAddress: string
  userAgent: string
  createdAt: DateTime
}
```

### CaptyOrder
```typescript
{
  id: uuid
  shop: string
  orderId: string
  orderName: string
  captyClickId: string
  captyUserId: string
  totalPrice: float
  currencyCode: string
  commissionAmount: float (totalPrice * 0.10)
  commissionRate: float (0.10)
  orderStatus: string
  commissionPaid: boolean
  createdAt: DateTime
  paidAt: DateTime
}
```

### Commission
```typescript
{
  id: uuid
  shop: string
  month: string (YYYY-MM format)
  totalOrders: int
  totalSales: float
  totalCommission: float
  isPaid: boolean
  paidAt: DateTime
  paymentMethod: string
  paymentRef: string
}
```

## API Endpoints

### For Mobile App

#### GET /api/products
Fetch published products for a shop

**Headers:**
```
x-capty-api-key: your-api-key-here
```

**Query Parameters:**
- `shop`: Store domain (e.g., "mystore.myshopify.com")

**Response:**
```json
{
  "success": true,
  "shop": "mystore.myshopify.com",
  "products": [
    {
      "id": "gid://shopify/Product/123",
      "shopify_product_id": "gid://shopify/Product/123",
      "title": "Innova Champion Destroyer",
      "handle": "destroyer",
      "shop": "mystore.myshopify.com",
      "variant_ids": ["gid://shopify/ProductVariant/456"],
      "published_at": "2025-01-10T12:00:00Z",
      "capty_url": "https://mystore.myshopify.com/a/capty?product=destroyer&shop=mystore.myshopify.com"
    }
  ],
  "total": 1
}
```

### For Click Tracking

#### GET /api/proxy
App proxy route for click tracking and redirection

**Query Parameters:**
- `capty_click_id`: Unique click identifier from Capty app
- `capty_user_id`: Optional user ID from Capty app
- `product`: Product handle
- `product_id`: Product ID (alternative to handle)
- `shop`: Store domain

**Flow:**
1. Saves click to database
2. Redirects to product page with click ID in URL
3. JavaScript captures and stores in cart

## Shopify Configuration

### App Scopes Required
```
read_orders
read_products
write_products
read_publications
write_publications
read_script_tags
write_script_tags
```

### Webhooks Registered
- `APP_UNINSTALLED`: Cleanup when app is uninstalled
- `ORDERS_CREATE`: Track commissions on new orders

### App Proxy
- **Proxy Path:** `/apps/capty`
- **Proxy URL:** Your app's `/api/proxy` route

## Setup Instructions

### 1. Environment Variables

Add to `.env`:
```bash
CAPTY_API_KEY=your-secret-api-key-for-mobile-app
DATABASE_URL="file:./dev.sqlite"
```

### 2. Database Migration

```bash
npx prisma generate
npx prisma db push
```

### 3. Install Tracking Script

The tracking script (`public/capty-tracking.js`) needs to be served and loaded on the store.

**Option A: Script Tag API (Automatic)**
Create a route that installs the script tag when the app is installed.

**Option B: Theme Extension (Recommended)**
Include the script in your app's theme extension.

### 4. Testing the Flow

1. **Publish a Product:**
   - Go to `/app`
   - Fetch products
   - Click "Add to Capty app"
   - Verify in `/app/publications`

2. **Simulate Mobile App Click:**
   ```
   https://your-store.myshopify.com/a/capty?capty_click_id=test123&capty_user_id=user456&product=destroyer&shop=your-store.myshopify.com
   ```

3. **Add to Cart & Checkout:**
   - Should redirect to product page
   - Add product to cart
   - Complete checkout
   - Check cart attributes include `capty_click_id`

4. **Verify Commission Tracking:**
   - Go to `/app/commissions`
   - Verify order appears with 10% commission

## Mobile App Integration

### Generating Capty URLs

When displaying products in the mobile app, generate tracking URLs:

```javascript
const captyClickId = generateUniqueId(); // UUID or unique string
const captyUserId = currentUser.id;
const shop = product.shop; // e.g., "mystore.myshopify.com"
const productHandle = product.handle;

const trackingUrl = `https://${shop}/a/capty?capty_click_id=${captyClickId}&capty_user_id=${captyUserId}&product=${productHandle}&shop=${shop}`;
```

### Fetching Products

```javascript
const response = await fetch(`https://your-app-url.com/api/products?shop=${shop}`, {
  headers: {
    'x-capty-api-key': 'your-api-key'
  }
});

const { products } = await response.json();
```

## Commission Payment Flow (Future)

### Option 1: Stripe Connect (Automated)
1. Store connects Stripe account
2. Monthly cron job calculates owed commission
3. Auto-charge via Stripe API
4. Update `Commission.isPaid = true`

### Option 2: Shopify Billing API
1. Use Shopify's usage charges
2. Charge monthly based on commission owed
3. Requires approval for recurring charges

### Option 3: Manual Invoice (Current)
1. Generate monthly report
2. Email invoice to store owner
3. Manual payment tracking
4. Mark as paid when received

## Security Considerations

1. **API Key Protection:**
   - Store `CAPTY_API_KEY` in environment variables
   - Don't expose in client-side code
   - Rotate periodically

2. **Click ID Validation:**
   - Ensure unique click IDs
   - Validate format before storing
   - Prevent injection attacks

3. **Commission Verification:**
   - Cross-reference with Shopify order data
   - Implement fraud detection
   - Audit commission calculations

## Troubleshooting

### Orders Not Tracking
1. Check webhook is registered: `shopify app webhooks list`
2. Verify `capty-tracking.js` is loading
3. Check browser console for errors
4. Verify cart attributes in test order

### Script Not Injecting Attributes
1. Check sessionStorage has `capty_click_id`
2. Verify Cart API permissions
3. Check CORS settings
4. Test manual Cart API call

### Products Not Appearing in Mobile App
1. Verify product is published: `/app/publications`
2. Check API key is correct
3. Verify shop domain format
4. Check database for `ProductPublication` records

## Next Steps

1. ✅ Core tracking system implemented
2. ⏳ Install script tag automatically on app install
3. ⏳ Add Stripe Connect integration
4. ⏳ Build automated monthly reporting
5. ⏳ Add analytics dashboard
6. ⏳ Implement fraud detection
7. ⏳ Add commission dispute system

## Support

For questions or issues, contact: support@capty.com

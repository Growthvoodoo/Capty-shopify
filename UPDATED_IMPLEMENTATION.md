# Capty Sales Channel App - Updated Implementation

## Overview
Complete disc golf sales channel app with manual disc data entry, localStorage storage, and enhanced commission tracking.

---

## ✅ Implemented Features

### 1. Sales Channel Integration
- **Status:** ✅ Complete
- Capty appears in Shopify product Publishing section
- Merchants toggle products ON/OFF for Capty channel
- Products sync via ProductListing API

### 2. Published Products with Disc Golf Data
- **Location:** `/app/publications`
- **Features:**
  - Lists all products published to Capty channel
  - "Edit Disc Data" button for each product
  - Manual input modal with fields:
    - Speed (default: 12.3)
    - Glide (default: 8.3)
    - Turn (default: 7.2)
    - Fade (default: 4.5)
    - Type (dropdown: Round, Driver, Mid-Range, Putter)
    - Disc Brand ID (default: 1)
  - Saves to localStorage: `captyDiscGolfData`
  - Product name, description, images pulled from Shopify

### 3. Mobile App API
- **Endpoint:** `GET /api/products?shop=yourstore.myshopify.com`
- **Headers:** `x-capty-api-key: capty-secret-key-2025`
- **Response Format:**
```json
{
  "success": true,
  "shop": "yourstore.myshopify.com",
  "products": [
    {
      "name": "Round Disc",
      "disc_brand_id": 1,
      "speed": 12.3,
      "glide": 8.3,
      "turn": 7.2,
      "fade": 4.5,
      "description": "Product description",
      "medias": ["https://cdn.shopify.com/image1.jpg", "..."],
      "type": "Round",
      "is_active": true,
      "tags": [24],
      "shopify_product_id": 123456789,
      "handle": "round-disc",
      "variants": [...],
      "capty_url": "https://shop.com/a/capty?product=round-disc&shop=shop.myshopify.com",
      "product_url": "https://shop.com/products/round-disc"
    }
  ],
  "total": 1
}
```

### 4. Enhanced Commission Tracking
- **User Tracking:** `capty_user_id` parameter tracked
- **Disc Tracking:** Specific product clicked is stored
- **Capty Order Reference:** `CAPTY-{orderId}-{clickId}`
- **Commission:** 10% of order total
- **Flow:**
  1. User clicks disc in mobile app
  2. Redirects to: `https://shop.com/products/disc?capty_click_id=xxx&capty_user_id=yyy`
  3. Click tracked in database with disc info
  4. User purchases → webhook fires
  5. Commission calculated and saved
  6. Capty order reference generated

### 5. Commission Dashboard
- **Location:** `/app/commissions`
- **Displays:**
  - Commission Owed, Paid, Total Orders (summary cards)
  - Monthly commission breakdown table
  - Recent Capty Orders with:
    - Order number
    - User ID
    - Capty Order Reference
    - Date
    - Order total
    - Commission amount
    - Payment status

---

## 📁 File Structure

### Updated Files:
```
app/routes/
├── app.publications.tsx    # Disc golf data entry with localStorage
├── app.commissions.tsx      # Enhanced with user & Capty ref
├── api.products.tsx         # Mobile API with disc golf format
├── webhooks.tsx            # Tracks user & specific disc clicked
└── api.proxy.tsx           # Click tracking (unchanged)

.env                        # Added CAPTY_API_KEY
```

---

## 🗄️ localStorage Structure

### Key: `captyDiscGolfData`
```json
{
  "gid://shopify/Product/123": {
    "disc_brand_id": 1,
    "speed": 12.3,
    "glide": 8.3,
    "turn": 7.2,
    "fade": 4.5,
    "type": "Round",
    "is_active": true,
    "tags": [24]
  },
  "gid://shopify/Product/456": {
    ...
  }
}
```

---

## 🔄 Complete User Journey

### Merchant Side:
1. Install Capty app
2. Go to Products → Select product
3. In Publishing section, toggle "Capty" ON
4. Go to Capty app → "Published to Capty"
5. Click "Edit Disc Data" button
6. Enter speed, glide, turn, fade (or use defaults)
7. Data saved to localStorage

### Mobile App Side:
1. Fetch products: `GET /api/products?shop=store.myshopify.com`
2. Display discs with images and disc golf specs
3. User clicks disc → redirects with tracking:
   ```
   https://store.com/products/disc?capty_click_id=abc123&capty_user_id=user456
   ```

### Commission Flow:
1. Click tracked in database with disc info
2. User adds to cart and checks out
3. Order created → webhook fires
4. System finds clicked disc from click record
5. Generates Capty order ref: `CAPTY-5001-abc123ab`
6. Calculates 10% commission
7. Saves to database with user & disc info
8. Appears in commission dashboard

---

## 🧪 Testing Instructions

### Test 1: Disc Golf Data Entry
1. Go to `/app/publications`
2. Click "Edit Disc Data" on any product
3. Enter custom values (e.g., speed: 14.0)
4. Click Save
5. Open browser console → check localStorage:
   ```js
   localStorage.getItem('captyDiscGolfData')
   ```
6. Should show your custom values

### Test 2: Mobile API
```bash
curl -H "x-capty-api-key: capty-secret-key-2025" \
  "https://your-dev-url.com/api/products?shop=yourstore.myshopify.com"
```
Should return products with disc golf data structure.

### Test 3: Commission Tracking
1. Manually create test URL:
   ```
   https://yourstore.myshopify.com/products/test-disc?capty_click_id=test123&capty_user_id=user456
   ```
2. Visit URL (click is tracked)
3. Add product to cart and checkout
4. Check `/app/commissions` dashboard
5. Should see order with:
   - User: user456
   - Capty Ref: CAPTY-{orderId}-test123
   - Commission: 10%

---

## 🚀 Deployment Checklist

- [ ] Update `CAPTY_API_KEY` in production environment
- [ ] Deploy app: `shopify app deploy`
- [ ] Update app proxy URL in Partner Dashboard
- [ ] Test mobile API from production URL
- [ ] Test commission flow with real purchase
- [ ] Verify localStorage persists across sessions

---

## 📝 Notes

### Default Values:
- disc_brand_id: 1
- speed: 12.3
- glide: 8.3
- turn: 7.2
- fade: 4.5
- type: "Round"
- tags: [24]

### Future Enhancements:
- [ ] Sync disc golf data to database for API access
- [ ] Brand mapping system
- [ ] AI extraction from product images
- [ ] Export commission reports
- [ ] Batch edit disc data

---

## 🔑 Environment Variables

```bash
CAPTY_API_KEY=capty-secret-key-2025
SHOPIFY_API_KEY=06c67977ed4e4772a1e64826c2aebac2
SHOPIFY_API_SECRET=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
```

---

## 📞 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/products` | GET | API Key | Fetch published discs for mobile app |
| `/api/proxy` | GET | None | Click tracking & redirect |
| `/webhooks` | POST | Shopify | Order webhook for commissions |

---

**Implementation Date:** November 12, 2025
**Status:** ✅ Complete and Ready for Testing

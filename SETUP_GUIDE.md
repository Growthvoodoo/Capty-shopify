# Capty Shopify App - Quick Setup Guide

This guide will help you get the Capty Shopify app up and running quickly.

## Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Create Your Shopify App

1. Visit [Shopify Partners](https://partners.shopify.com/)
2. Click "Apps" → "Create app"
3. Choose "Create app manually"
4. Fill in:
   - **App name**: Capty Disc Golf
   - **App URL**: (You'll update this after starting the dev server)

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Shopify app credentials from the Partners dashboard.

### Step 4: Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### Step 5: Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### Step 6: Set Up Tunneling (Development Only)

To test the app with a real Shopify store, you need to expose your local server:

**Option A: Using ngrok**
```bash
ngrok http 3000
```

**Option B: Using Cloudflare Tunnel**
```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the HTTPS URL provided (e.g., `https://abc123.ngrok.io`)

### Step 7: Update Shopify App URLs

In your Shopify Partners dashboard, update:
- **App URL**: `https://your-tunnel-url.ngrok.io`
- **Allowed redirection URL(s)**:
  - `https://your-tunnel-url.ngrok.io/auth/callback`
  - `https://your-tunnel-url.ngrok.io/auth/shopify/callback`

Also update your `.env` file:
```env
HOST=https://your-tunnel-url.ngrok.io
```

### Step 8: Install on Test Store

1. In Shopify Partners, go to your app
2. Click "Select store" and choose your development store
3. Click "Install app"
4. Approve the permissions

## You're Ready!

Your app should now be running. Click "Fetch Products" to see products from your test store.

## Common Issues

### Issue: "App installation failed"
**Solution**: Make sure your tunnel URL is correct in both `.env` and Shopify Partners dashboard.

### Issue: "Products not loading"
**Solution**: Verify your test store has products. Create a few test products if needed.

### Issue: "Database error"
**Solution**: Run `npx prisma db push` again to reset the database.

## Next Steps (Phase 2)

Once Phase 1 is working, you can prepare for Phase 2:
- API endpoint for saving edited product data
- Shipping area configuration
- Order tracking with cookie parameters
- Commission tracking (10% of sales)

## Development Tips

1. Use Shopify's test data generators to create sample products
2. Keep your ngrok/tunnel running while developing
3. Check browser console for any JavaScript errors
4. Use Shopify's GraphQL explorer to test queries: `yourstore.myshopify.com/admin/api/graphql.json`

## Support Resources

- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [Remix Documentation](https://remix.run/docs)
- [Shopify Polaris Components](https://polaris.shopify.com/)
- [GraphQL Admin API](https://shopify.dev/docs/api/admin-graphql)

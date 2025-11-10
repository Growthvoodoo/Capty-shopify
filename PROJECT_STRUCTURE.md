# Capty Shopify App - Project Structure

## Overview

This is a Shopify embedded app built with Remix, React, and Shopify Polaris for managing disc golf products across multiple Shopify stores.

## Directory Structure

```
Capty/
├── app/                                # Main application code
│   ├── routes/                         # Remix routes
│   │   ├── app._index.tsx             # Main dashboard with product fetching UI
│   │   ├── app.tsx                     # App layout wrapper with Polaris
│   │   ├── app.exit-iframe.tsx        # Exit iframe handler
│   │   ├── auth.$.tsx                  # Auth callback handler
│   │   ├── auth.login/                 # Login route
│   │   │   └── route.tsx
│   │   └── webhooks.tsx                # Webhook handlers (app uninstall, etc.)
│   ├── db.server.ts                    # Prisma database client
│   ├── entry.client.tsx                # Client-side entry point
│   ├── entry.server.tsx                # Server-side rendering entry
│   ├── root.tsx                        # Root layout component
│   └── shopify.server.ts               # Shopify app configuration
├── prisma/
│   └── schema.prisma                   # Database schema (sessions)
├── public/
│   └── favicon.ico                     # App favicon
├── .env.example                        # Environment variables template
├── .eslintrc.cjs                       # ESLint configuration
├── .gitignore                          # Git ignore rules
├── .prettierrc                         # Prettier code formatting
├── package.json                        # Dependencies and scripts
├── README.md                           # Main documentation
├── SETUP_GUIDE.md                      # Quick setup instructions
├── PROJECT_STRUCTURE.md                # This file
├── remix.config.js                     # Remix configuration
├── setup.sh                            # Automated setup script
├── shopify.app.toml                    # Shopify CLI configuration
├── tsconfig.json                       # TypeScript configuration
└── vite.config.ts                      # Vite bundler configuration
```

## Key Files Explained

### `app/routes/app._index.tsx`
The main page of your app. Contains:
- "Fetch Products" button
- Product display with title, description, price, inventory
- Variant information (SKU, price, weight, inventory)
- Inline editing capability for product fields
- Visual indicators for modified products

### `app/shopify.server.ts`
Configures the Shopify app with:
- API credentials
- OAuth authentication
- Session storage (Prisma)
- Webhook subscriptions
- GraphQL Admin API access

### `prisma/schema.prisma`
Database schema for storing:
- Shopify session data
- Shop information
- Access tokens

### `shopify.app.toml`
Shopify CLI configuration:
- App name and URLs
- API scopes (read_products, read_orders, write_products)
- Webhook subscriptions
- OAuth redirect URLs

## Features Implemented (Phase 1)

### 1. Product Fetching
- Uses Shopify GraphQL Admin API
- Fetches up to 50 products per request
- Includes product variants
- Retrieves images, pricing, and inventory data

### 2. Product Display
- Clean card-based UI using Shopify Polaris
- Shows all product details in organized sections
- Data table for variants
- Responsive layout

### 3. Product Editing
- Inline editing for title and description
- Changes tracked in component state
- Visual "Modified" badge for edited products
- Ready for Phase 2 API integration

### 4. Authentication
- OAuth 2.0 flow
- Secure session management
- Embedded app authentication

## Phase 1 Capabilities

✅ Fetch products from Shopify store
✅ Display product title, description, price, inventory
✅ Show product variants with details
✅ Edit product information in the UI
✅ Track which products were modified
✅ Embedded app experience with Polaris UI

## Phase 2 Roadmap

🔄 Save edited data to external database via API
🔄 Shipping area management for each store
🔄 Cookie-based order tracking
🔄 Commission tracking (10% of sales)
🔄 Multi-store product aggregation
🔄 Disc-specific field mapping (plastic type, weight, color)

## Technology Stack

- **Framework**: Remix (React-based)
- **UI Library**: Shopify Polaris
- **Database**: SQLite (via Prisma ORM)
- **Authentication**: Shopify OAuth
- **API**: Shopify GraphQL Admin API
- **Language**: TypeScript
- **Bundler**: Vite

## API Endpoints

### `/app` (GET)
Main dashboard route, displays product fetching interface

### `/app` (POST)
Handles product fetching action via Shopify GraphQL API

### `/auth/login` (GET)
Initiates Shopify OAuth flow

### `/auth/callback` (GET)
Handles OAuth callback and session creation

### `/webhooks` (POST)
Receives Shopify webhooks (app uninstall)

## GraphQL Query Used

```graphql
query getProducts {
  products(first: 50) {
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
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              inventoryQuantity
              sku
              weight
              weightUnit
            }
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
      }
    }
  }
}
```

## Environment Variables Required

```
SHOPIFY_API_KEY=           # From Shopify Partners dashboard
SHOPIFY_API_SECRET=        # From Shopify Partners dashboard
SCOPES=                    # read_products,read_orders,write_products
HOST=                      # Your app URL (ngrok/production)
DATABASE_URL=              # SQLite file path
```

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Expose with tunnel**: `ngrok http 3000`
3. **Update app URLs** in Shopify Partners
4. **Install on test store**
5. **Test product fetching**
6. **Iterate on features**

## Security Considerations

- API keys stored in environment variables
- Session tokens encrypted in database
- OAuth 2.0 for authentication
- HTTPS required for production
- Webhook signature verification

## Performance Notes

- Products fetched on demand (not automatic)
- GraphQL query limited to 50 products
- Can be paginated in future updates
- Local state management for edits (no unnecessary API calls)

## Future Enhancements

- Pagination for large product catalogs
- Bulk edit capabilities
- Product filtering and search
- Export functionality
- Real-time sync with Shopify
- Multi-language support
- Advanced variant management

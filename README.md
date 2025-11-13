# Capty Shopify App

A Shopify sales channel app for the Capty disc golf marketplace. This app allows disc golf stores to publish their products to the Capty mobile app and earn commissions on sales from tracked links.

## Features

- 🏪 **Sales Channel Integration** - Products appear in Shopify's Publishing section
- 🥏 **Disc Golf Data Management** - Store speed, glide, turn, fade, and other disc specifications
- 💰 **Commission Tracking** - Automatic 10% commission on sales from Capty mobile app
- 📊 **Dashboard** - View commissions, track orders, and manage published products
- 🔗 **Click Attribution** - Track which user and disc drove each sale
- 📱 **Mobile App API** - Endpoint for Capty mobile app to fetch products

##  Quick Start

### Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:3000
```

### Deployment to DigitalOcean

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive deployment instructions.

**⚠️ Critical for deployment:** Set `DATABASE_URL=file:/data/prod.sqlite` (absolute path!) to avoid "non-zero exit code" error.

## Prerequisites

- Node.js 18 or higher
- A Shopify Partner account
- A Shopify development store (for testing)
- DigitalOcean account (for deployment)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Shopify app credentials:

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SCOPES=read_products,read_orders,write_products
HOST=https://your-app-url.com
DATABASE_URL=file:./dev.sqlite
```

### 3. Create a Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create a new app
3. Set the app URL to your development URL (e.g., `https://your-ngrok-url.ngrok.io`)
4. Set the redirect URL to `https://your-ngrok-url.ngrok.io/auth/callback`
5. Copy the API key and API secret to your `.env` file

### 4. Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 6. Expose Your Local Server (for development)

Use a tunneling service like ngrok or Cloudflare Tunnel:

```bash
ngrok http 3000
```

Update your `.env` file with the ngrok URL.

## How to Use

1. Install the app on a Shopify store
2. Once installed, you'll see the Capty Product Manager dashboard
3. Click the "Fetch Products" button to retrieve all products from the store
4. Products will be displayed with their details (title, description, price, inventory, variants)
5. Edit any product information directly in the interface
6. Modified products are highlighted with a "Modified" badge

## Project Structure

```
Capty/
├── app/
│   ├── routes/
│   │   ├── app._index.tsx         # Main product fetching UI
│   │   ├── app.tsx                 # App layout with Polaris
│   │   ├── auth.$.tsx              # Auth callback
│   │   ├── auth.login/             # Login route
│   │   └── webhooks.tsx            # Webhook handlers
│   ├── shopify.server.ts           # Shopify app configuration
│   ├── db.server.ts                # Prisma client
│   └── root.tsx                    # Root layout
├── prisma/
│   └── schema.prisma               # Database schema
├── package.json
└── .env                            # Environment variables
```

## API Scopes

The app requires the following Shopify API scopes:

- `read_products` - To fetch product information
- `read_orders` - To track orders (Phase 2)
- `write_products` - For future product updates (Phase 2)

## Phase 2 (Coming Soon)

- Save edited product data to external database via API
- Track which products were viewed/purchased through Capty
- Shipping area management for webshops
- Cookie-based tracking for affiliate commission (10% of sales)

## Troubleshooting

### Database Issues

If you encounter database issues, reset the database:

```bash
rm prisma/dev.sqlite*
npx prisma db push
```

### Authentication Issues

1. Make sure your `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
2. Verify your app URL in Shopify Partners matches your development URL
3. Clear browser cookies and try reinstalling the app

### Products Not Fetching

1. Ensure the store has products
2. Check the browser console for errors
3. Verify the app has the correct scopes installed

## Support

For issues or questions, please refer to the [Shopify App Development Documentation](https://shopify.dev/docs/apps).

## License

Private - Capty Project

#!/bin/bash

echo "🏌️ Capty Shopify App Setup Script"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your Shopify credentials"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Shopify app credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Use ngrok or cloudflare tunnel to expose your local server"
echo "4. Update your Shopify app URLs in Partners dashboard"
echo "5. Install the app on your test store"
echo ""
echo "📖 See SETUP_GUIDE.md for detailed instructions"

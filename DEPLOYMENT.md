# Capty Shopify App - DigitalOcean Deployment Guide

This guide will help you deploy the Capty Shopify app to DigitalOcean and fix the "non-zero exit code" error.

## 🚨 Common Deployment Errors & Fixes

### Error: "Your deploy failed because your container exited with a non-zero exit code"

**Root Cause:** Database configuration issues, missing environment variables, or Prisma client not generated.

**Solutions:**

#### 1. Fix Database URL Configuration

The most common cause is incorrect `DATABASE_URL` environment variable.

**❌ Wrong (causes errors):**
```
DATABASE_URL=file:./dev.sqlite        # Relative path - fails in containers
DATABASE_URL=file:dev.sqlite          # No path - fails
```

**✅ Correct:**
```
DATABASE_URL=file:/data/prod.sqlite   # Absolute path with /data directory
```

#### 2. Ensure Prisma is in Production Dependencies

**⚠️ CRITICAL:** `prisma` must be in `dependencies`, NOT `devDependencies`!

Production builds don't install devDependencies, so `prisma generate` will fail if the CLI isn't available.

```json
{
  "dependencies": {
    "@prisma/client": "^5.9.1",
    "prisma": "^5.9.1",  // ← Must be here, NOT in devDependencies
    ...
  }
}
```

#### 3. Add Prisma Generation Scripts

Add `postinstall` script to `package.json` (already added):

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "setup:production": "prisma db push && prisma generate"
  }
}
```

## 📋 Step-by-Step DigitalOcean Deployment

### Step 1: Prepare Your Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for DigitalOcean deployment"
   git push origin main
   ```

2. **Verify `.dockerignore` exists** (already created)

### Step 2: Create App on DigitalOcean

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Select **GitHub** as source
4. Choose repository: `Growthvoodoo/Capty-shopify`
5. Select branch: `main`

### Step 3: Configure App Settings

#### Build Settings

- **Build Command:** `npm run build`
- **Run Command:** `npm start`
- **Node Version:** 18.x or higher

#### Environment Variables (CRITICAL!)

Add these environment variables in DigitalOcean dashboard:

```
SHOPIFY_API_KEY=06c67977ed4e4772a1e64826c2aebac2
SHOPIFY_API_SECRET=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
SCOPES=read_product_listings,write_product_listings,read_publications,write_publications,read_channels,write_channels,read_products,write_products,read_orders,read_script_tags,write_script_tags
SHOPIFY_APP_URL=https://YOUR-APP-NAME.ondigitalocean.app
HOST=https://YOUR-APP-NAME.ondigitalocean.app
DATABASE_URL=file:/data/prod.sqlite
NODE_ENV=production
CAPTY_API_KEY=capty-secret-key-2025
```

**⚠️ IMPORTANT:**
- Replace `YOUR-APP-NAME` with your actual DigitalOcean app name
- The `DATABASE_URL` MUST use an absolute path: `file:/data/prod.sqlite`
- Do NOT use relative paths like `./dev.sqlite` or `file:dev.sqlite`

### Step 4: Add Persistent Storage (for Database)

1. In DigitalOcean dashboard, go to **Components** tab
2. Click **"Add Component"** → **"Volume"**
3. Configure:
   - **Name:** `capty-database`
   - **Mount Path:** `/data`
   - **Size:** 1 GB (minimum)

This ensures your SQLite database persists across deployments.

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (5-10 minutes)
3. Monitor the build logs for errors

### Step 6: Initialize Database

After first deployment, run these commands via DigitalOcean Console:

```bash
# Access your app's console in DigitalOcean
npm run setup:production
```

Or manually:
```bash
npx prisma db push
npx prisma generate
```

## 🔍 Troubleshooting Deployment Issues

### Issue 1: "Container exited with non-zero exit code"

**Check These:**

1. **Database URL is absolute path**
   ```bash
   # In DigitalOcean env vars, verify:
   DATABASE_URL=file:/data/prod.sqlite  ✅
   # NOT:
   DATABASE_URL=file:./dev.sqlite  ❌
   DATABASE_URL=file:dev.sqlite     ❌
   ```

2. **Prisma client is generated**
   ```bash
   # Verify postinstall script in package.json:
   "postinstall": "prisma generate"
   ```

3. **All required env vars are set** (see Step 3 above)

4. **Node version is 18+**
   - Check in DigitalOcean → Settings → Runtime & Build

### Issue 2: "Module not found: prisma client" or "prisma: command not found"

**Fix:**
- **Most Common Cause:** `prisma` is in `devDependencies` instead of `dependencies`
  ```json
  // ❌ Wrong - causes "command not found" in production:
  "devDependencies": {
    "prisma": "^5.9.1"
  }

  // ✅ Correct - available in production:
  "dependencies": {
    "prisma": "^5.9.1"
  }
  ```
- Also ensure `postinstall` script runs: `"postinstall": "prisma generate"`
- Or add to build command: `npm run build && prisma generate`

### Issue 3: "Database is locked" or "Cannot access database"

**Fix:**
- Ensure persistent volume is mounted to `/data`
- DATABASE_URL must point to `/data/prod.sqlite`
- Volume must have write permissions

### Issue 4: App starts but webhooks don't work

**Fix:**
1. Update Shopify Partner Dashboard:
   - Go to your app settings
   - Update App URL to: `https://YOUR-APP.ondigitalocean.app`
   - Update Redirect URLs

2. Reinstall app on test store

3. Webhooks are auto-registered on install

## 🔄 Post-Deployment Setup

### 1. Update Shopify App URLs

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Select your app
3. Update these URLs:
   - **App URL:** `https://YOUR-APP.ondigitalocean.app`
   - **Allowed redirection URL(s):**
     ```
     https://YOUR-APP.ondigitalocean.app/auth/callback
     https://YOUR-APP.ondigitalocean.app/auth/shopify/callback
     https://YOUR-APP.ondigitalocean.app/api/auth/callback
     ```

### 2. Reinstall Tracking Script

After deployment, the tracking script URL will change:

1. Go to your deployed app
2. Navigate to **Install Script**
3. Click **"Reinstall Tracking Script"**
4. This will install the script with your production URL

### 3. Test Commission Tracking

1. Use the test URL format:
   ```
   https://YOUR-STORE.myshopify.com/products/YOUR-PRODUCT?capty_click_id=TEST-001&capty_user_id=test-user
   ```

2. Complete a test order

3. Check **Commissions** page in your app

## 📝 Environment Variables Reference

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `SHOPIFY_API_KEY` | `06c67977...` | ✅ | From Partner Dashboard |
| `SHOPIFY_API_SECRET` | `shpss_...` | ✅ | From Partner Dashboard |
| `SCOPES` | `read_products,...` | ✅ | OAuth scopes |
| `SHOPIFY_APP_URL` | `https://app.ondigitalocean.app` | ✅ | Your deployed URL |
| `HOST` | `https://app.ondigitalocean.app` | ✅ | Same as SHOPIFY_APP_URL |
| `DATABASE_URL` | `file:/data/prod.sqlite` | ✅ | **Must be absolute path** |
| `NODE_ENV` | `production` | ✅ | Set to production |
| `CAPTY_API_KEY` | `capty-secret-key-2025` | ✅ | For mobile app API |

## 🚀 Deployment Checklist

Before deploying, verify:

- [ ] `.dockerignore` file exists
- [ ] **`prisma` is in `dependencies`, NOT `devDependencies`** ⚠️ CRITICAL!
- [ ] `postinstall` script in package.json: `"postinstall": "prisma generate"`
- [ ] All environment variables set in DigitalOcean
- [ ] `DATABASE_URL` uses absolute path: `file:/data/prod.sqlite`
- [ ] Persistent volume configured at `/data`
- [ ] GitHub repository connected
- [ ] Shopify Partner Dashboard URLs updated

After deployment:

- [ ] App accessible at deployment URL
- [ ] Database initialized (`npm run setup:production`)
- [ ] Tracking script reinstalled with production URL
- [ ] Test order completed successfully
- [ ] Commission tracked correctly
- [ ] Webhooks firing (check logs)

## 📞 Need Help?

If you still encounter the "non-zero exit code" error after following this guide:

1. **Check DigitalOcean build logs:**
   - Go to your app → Runtime Logs
   - Look for error messages
   - Check if Prisma generate failed

2. **Verify environment variables:**
   - Ensure `DATABASE_URL` is exactly: `file:/data/prod.sqlite`
   - Check all required vars are set

3. **Test locally first:**
   ```bash
   # Set production-like env
   export DATABASE_URL=file:/tmp/test.sqlite
   export NODE_ENV=production
   npm run build
   npm start
   ```

## 🔧 Manual Database Setup (If Needed)

If automatic database setup fails:

```bash
# SSH into your DigitalOcean app console
cd /workspace

# Create database directory
mkdir -p /data

# Run Prisma setup
DATABASE_URL=file:/data/prod.sqlite npx prisma db push
DATABASE_URL=file:/data/prod.sqlite npx prisma generate

# Restart app
exit
```

## 🎯 Quick Fix Summary

**The #1 fix for "non-zero exit code" error:**

```bash
# In DigitalOcean environment variables, set:
DATABASE_URL=file:/data/prod.sqlite

# NOT any of these:
DATABASE_URL=file:./dev.sqlite  ❌
DATABASE_URL=file:dev.sqlite     ❌
DATABASE_URL=./dev.sqlite        ❌
```

This absolute path ensures the database is created in the persistent volume and accessible by the container.

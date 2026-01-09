# DyeInk Migration Guide: Supabase to MongoDB + Auth0 + Cloudflare Workers

This guide covers the complete migration from Supabase to:
- **Backend**: Fastify + MongoDB
- **Authentication**: Auth0
- **Storage**: Cloudflare R2
- **Deployment**: Cloudflare Workers

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Setup](#mongodb-setup)
3. [Auth0 Setup](#auth0-setup)
4. [Cloudflare Setup](#cloudflare-setup)
5. [Backend Configuration](#backend-configuration)
6. [Frontend Configuration](#frontend-configuration)
7. [Data Migration](#data-migration)
8. [Deployment](#deployment)
9. [Testing](#testing)

---

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (you have $50 credit)
- Auth0 account (free tier: 7,500 MAU)
- Cloudflare account (free tier: 100K requests/day)
- Vercel account (for domain management)

---

## MongoDB Setup

### 1. Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new project: `dyeink`
3. Deploy a free cluster (M0) or use your $50 credit for a paid tier
4. Create a database user with read/write access
5. Whitelist IP addresses (or allow all: `0.0.0.0/0`)

### 2. Enable MongoDB Data API (for Cloudflare Workers)

1. Go to **Data Services** > **Data API**
2. Enable the Data API
3. Copy the **App ID** and generate an **API Key**
4. Note the Data API URL: `https://data.mongodb-api.com/app/{APP_ID}/endpoint/data/v1`

### 3. Get Connection String

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/dyeink?retryWrites=true&w=majority
```

---

## Auth0 Setup

### 1. Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Create a new **Single Page Application**
3. Configure settings:
   - **Allowed Callback URLs**: `http://localhost:5173, https://yourdomain.com`
   - **Allowed Logout URLs**: `http://localhost:5173, https://yourdomain.com`
   - **Allowed Web Origins**: `http://localhost:5173, https://yourdomain.com`

### 2. Create Auth0 API

1. Go to **APIs** > Create API
2. Name: `DyeInk API`
3. Identifier: `https://api.dyeink.com` (this is your audience)
4. Signing Algorithm: RS256

### 3. Configure Social Connections

1. Go to **Authentication** > **Social**
2. Enable **GitHub** connection
3. Configure with your GitHub OAuth app credentials

### 4. Get Credentials

Note down:
- **Domain**: `your-tenant.auth0.com`
- **Client ID**: from your SPA application
- **Client Secret**: from your SPA application (for backend)
- **Audience**: `https://api.dyeink.com`

### 5. Get Management API Token (for user deletion)

1. Go to **APIs** > **Auth0 Management API**
2. Create a Machine-to-Machine application
3. Grant permissions: `delete:users`
4. Get the token for backend user deletion

---

## Cloudflare Setup

### 1. Create R2 Bucket

1. Go to Cloudflare Dashboard > **R2**
2. Create bucket: `dyeink-images`
3. Enable public access or set up a custom domain
4. Create API tokens with R2 read/write permissions

### 2. Get R2 Credentials

- **Account ID**: from Cloudflare dashboard
- **Access Key ID**: from R2 API tokens
- **Secret Access Key**: from R2 API tokens
- **Bucket Name**: `dyeink-images`
- **Public URL**: `https://your-bucket.r2.dev` or custom domain

---

## Backend Configuration

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Create Environment File

Copy `.env.example` to `.env` and fill in your values:

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dyeink

# For Cloudflare Workers (MongoDB Data API)
MONGODB_DATA_API_URL=https://data.mongodb-api.com/app/YOUR_APP_ID/endpoint/data/v1
MONGODB_DATA_API_KEY=your-api-key
MONGODB_DATABASE=dyeink

# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.dyeink.com
AUTH0_MANAGEMENT_API_TOKEN=your-management-token

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=dyeink-images
R2_PUBLIC_URL=https://your-r2-bucket.r2.dev

# Vercel (domain management)
VERCEL_TOKEN=your-vercel-token
VERCEL_PROJECT_ID=your-project-id
VERCEL_TEAM_ID=your-team-id

# App
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### 3. Run Development Server

```bash
npm run dev
```

---

## Frontend Configuration

### 1. Install Dependencies

```bash
cd platform
npm install
```

### 2. Create Environment File

Copy `.env.example` to `.env`:

```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://api.dyeink.com
VITE_AUTH0_REDIRECT_URI=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. Run Development Server

```bash
npm run dev
```

---

## Data Migration

### 1. Export Data from Supabase

```sql
-- Export users (you'll need to recreate in Auth0)
SELECT * FROM auth.users;

-- Export posts
SELECT * FROM posts;

-- Export site_settings
SELECT * FROM site_settings;

-- Export subscribers
SELECT * FROM subscribers;
```

### 2. Import to MongoDB

Create a migration script or use MongoDB Compass to import JSON data.

Example post document structure:
```json
{
  "_id": "user-id_1234567890",
  "userId": "auth0|user123",
  "title": "My Post",
  "slug": "my-post",
  "content": "<p>Content here</p>",
  "excerpt": "Excerpt here",
  "coverImage": "https://r2.dev/image.webp",
  "published": true,
  "publishedAt": "2024-01-01T00:00:00Z",
  "views": 100,
  "shares": 10,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 3. Migrate Images

1. Download images from Supabase storage
2. Upload to Cloudflare R2
3. Update image URLs in posts

---

## Deployment

### Option 1: Cloudflare Workers (Recommended)

1. Configure `wrangler.toml` with your settings
2. Add secrets:

```bash
cd backend
wrangler secret put MONGODB_DATA_API_KEY
wrangler secret put MONGODB_DATA_API_URL
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_AUDIENCE
# ... add all other secrets
```

3. Deploy:

```bash
npm run deploy
```

### Option 2: Traditional Server (Railway, Render, etc.)

1. Build the backend:
```bash
npm run build
```

2. Deploy using your preferred platform
3. Set environment variables in your platform's dashboard

### Frontend Deployment (Vercel)

1. Update `VITE_API_BASE_URL` to your deployed backend URL
2. Deploy to Vercel as usual

---

## Testing

### 1. Test Authentication

```bash
# Login flow
curl -X POST http://localhost:3000/api/auth/register \
  -H "Authorization: Bearer YOUR_AUTH0_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auth0Id": "auth0|123", "email": "test@example.com"}'
```

### 2. Test Posts API

```bash
# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer YOUR_AUTH0_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Post", "slug": "test-post", "content": "Hello"}'
```

### 3. Test Image Upload

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_AUTH0_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

---

## Troubleshooting

### CORS Issues
- Ensure `FRONTEND_URL` is set correctly
- Check Auth0 allowed origins

### Auth0 Token Issues
- Verify audience matches in both Auth0 and backend
- Check token expiration
- Ensure JWKS endpoint is accessible

### MongoDB Connection Issues
- Check IP whitelist in MongoDB Atlas
- Verify connection string
- For Workers: ensure Data API is enabled

### R2 Upload Issues
- Check bucket permissions
- Verify R2 credentials
- Ensure public access is enabled

---

## File Structure

```
/dyeink
├── /backend                 # Fastify backend
│   ├── /src
│   │   ├── /config         # Database config
│   │   ├── /middleware     # Auth middleware
│   │   ├── /models         # MongoDB schemas
│   │   ├── /routes         # API routes
│   │   ├── /services       # Business logic
│   │   ├── index.ts        # Fastify entry
│   │   └── worker.ts       # Cloudflare Worker entry
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml       # Cloudflare config
│
├── /platform               # React frontend
│   ├── /src
│   │   ├── /lib
│   │   │   ├── auth0.ts    # Auth0 client
│   │   │   └── apiClient.ts # API client
│   │   ├── /services       # API services
│   │   ├── /stores         # Zustand stores
│   │   └── ...
│   └── package.json
│
└── MIGRATION_GUIDE.md
```

---

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check backend logs
3. Verify all environment variables are set
4. Test API endpoints individually

Good luck with your migration!

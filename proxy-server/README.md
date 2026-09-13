# Translation Proxy Server

Simple Node.js server to fetch Google Sheets data and provide it via API.

## Setup

```bash
cd proxy-server
npm install
npm start
```

Server runs on `http://localhost:3000`

## Endpoints

### POST /sync-translations
Fetch and parse Google Sheet translations.

**Response:**
```json
{
  "success": true,
  "message": "Translations synced successfully!",
  "data": {
    "en": { "translate": { "title": "..." } },
    "vi": { "translate": { "title": "..." } }
  }
}
```

### GET /health
Health check endpoint.

## Deploy to Railway

1. Push this folder to GitHub (or create separate repo)
2. Go to https://railway.app
3. Create new project → Deploy from GitHub
4. Select repo → Deploy
5. Copy Railway URL
6. Use in Netlify Function: `https://your-app.railway.app/sync-translations`

## Environment Variables

No environment variables needed. Server uses public Google Sheet.

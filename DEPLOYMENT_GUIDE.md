# FanCake Staging - Deployment Guide

## 🚀 Database Status: ✅ OPERATIONAL
- **Project ID:** lftlvycvgauzrryyqxpu
- **API URL:** https://lftlvycvgauzrryyqxpu.supabase.co/rest/v1/
- **Schema:** Complete with 15 tables, triggers, and full-text search

## 🔑 Authentication Setup

### 1. Configure Supabase Auth
1. Go to: https://supabase.com/dashboard/project/lftlvycvgauzrryyqxpu/auth
2. Enable providers:
   - Email (required)
   - Google (optional)
   - GitHub (optional)
3. Configure site URL: `http://localhost:3000` for development

### 2. Get API Keys
1. Go to: https://supabase.com/dashboard/project/lftlvycvgauzrryyqxpu/settings/api
2. Copy:
   - `anon` public key → Frontend
   - `service_role` secret key → Backend only

### 3. Update Frontend
Replace in `frontend/app.js`:
```javascript
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

## 🌐 Frontend Deployment

### Option A: Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `cd frontend && vercel --prod`
3. Set environment variables in Vercel dashboard

### Option B: Netlify
1. Push to GitHub
2. Connect Netlify to repository
3. Set build command: `echo "Static site"`
4. Set publish directory: `.`

### Option C: Local Development
```bash
cd frontend
npx serve .  # Serves on http://localhost:3000
```

## 📊 API Testing

### Test Database Connection
```bash
# List users
curl "https://lftlvycvgauzrryyqxpu.supabase.co/rest/v1/users" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Search media
curl -X POST "https://lftlvycvgauzrryyqxpu.supabase.co/rest/v1/rpc/search_media" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"search_query": "test", "limit_val": 5}'
```

## 🔧 Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://lftlvycvgauzrryyqxpu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Backend (.env)
```
SUPABASE_URL=https://lftlvycvgauzrryyqxpu.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
DATABASE_URL=postgresql://postgres:[password]@db.lftlvycvgauzrryyqxpu.supabase.co:5432/postgres
```

## 🐛 Troubleshooting

### Media Creation Fails
- Ensure `search_vector` trigger is active (migration 002 applied)
- Check that user exists and `is_creator=true`

### API Authentication Fails
- Verify API keys are correct
- Check CORS settings in Supabase dashboard
- Ensure `Authorization` header includes "Bearer "

### Search Not Working
- Verify `search_media` function exists
- Check that media has `search_vector` populated (trigger working)

## 📞 Support
- GitHub: https://github.com/chandyd/fancake-staging
- Supabase Project: lftlvycvgauzrryyqxpu
- Created: 2026-04-22
- Status: ✅ Production Ready

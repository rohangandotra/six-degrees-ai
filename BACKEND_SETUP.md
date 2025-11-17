# Backend Setup Guide - 6th Degree AI

Complete setup guide to connect your Next.js UI to the Supabase backend.

## 🎯 What's Been Built

✅ **15 API routes** fully implemented with security
✅ **Rate limiting** on all endpoints (prevent abuse)
✅ **Input validation** and sanitization (prevent XSS/SQL injection)
✅ **Security logging** for all events
✅ **Admin Supabase client** for server-side operations
✅ **Error handling** and proper HTTP status codes

## 📁 API Routes Created

### Authentication (`/api/auth/...`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Contacts (`/api/contacts/...`)
- `POST /api/contacts/upload` - Upload CSV contacts
- `GET /api/contacts/list?userId=xxx` - List user's contacts

### Search (`/api/search/...`)
- `POST /api/search` - Search contacts (my network + extended)

### Connections (`/api/connections/...`)
- `POST /api/connections/send-request` - Send connection request
- `POST /api/connections/accept` - Accept connection
- `GET /api/connections/list?userId=xxx` - List connections

### Profile (`/api/profile/...`)
- `GET /api/profile?userId=xxx` - Get profile
- `POST /api/profile` - Create profile
- `PUT /api/profile` - Update profile

### Email Generation (`/api/email/...`)
- `POST /api/email/generate` - Generate AI email

## 🚀 Quick Start (5 Steps)

### Step 1: Get Supabase Credentials (2 minutes)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings → API**
4. Copy these 3 values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJhbGc...`)
   - **service_role** key (starts with `eyJhbGc...`)

### Step 2: Create Environment File (1 minute)

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   OPENAI_API_KEY=sk-...
   ```

### Step 3: Install Dependencies (Already Done!)

Dependencies are already installed:
- ✅ @supabase/supabase-js
- ✅ @supabase/ssr
- ✅ bcryptjs
- ✅ papaparse
- ✅ openai

### Step 4: Test Locally (2 minutes)

```bash
npm run dev
```

Open http://localhost:3000

Try:
1. Register a new user
2. Login
3. Upload a CSV
4. Search contacts

### Step 5: Deploy to Vercel (5 minutes)

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Add backend API routes"
   git push
   ```

2. Go to https://vercel.com → New Project
3. Import your GitHub repo
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
5. Deploy!

## 🔒 Security Features

### Rate Limiting
All endpoints are protected:
- **Auth**: 5 attempts per 5 minutes
- **Search**: 20 per minute
- **Upload**: 3 per hour
- **Connections**: 10 per hour
- **Email Gen**: 10 per 5 minutes

### Input Validation
- Email format validation
- Password strength (8+ chars, uppercase, lowercase, number)
- UUID validation
- Search query sanitization
- CSV injection prevention

### XSS Protection
All user inputs are sanitized using HTML entity encoding.

### SQL Injection Protection
- All queries use Supabase client (parameterized)
- Additional pattern detection in search queries

### Security Logging
All events logged with severity levels:
- Login attempts (success/failure)
- Rate limit violations
- Malicious input detection
- Profile changes
- Connection requests

## 🧪 Testing Your API

### Test Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "full_name": "Test User",
    "organization": "Test Org"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "full_name": "Test User"
  }
}
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### Test Upload

```bash
curl -X POST http://localhost:3000/api/contacts/upload \
  -F "file=@contacts.csv" \
  -F "userId=YOUR_USER_ID"
```

### Test Search

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "query": "engineer",
    "searchExtended": false
  }'
```

## 📊 Database Schema

Your Supabase database already has these tables:

### `users`
- id, email, full_name, organization
- password_hash, email_verified
- verification_token, reset_token
- created_at

### `user_contacts`
- id, user_id (FK)
- full_name, email, position, company
- created_at

### `user_connections`
- id, user_id (FK), connected_user_id (FK)
- status (pending/accepted/declined)
- request_message
- requester_shares_network, accepter_shares_network
- created_at, accepted_at

### `user_profiles`
- id, user_id (FK)
- current_role, current_company, industry
- company_stage, location_city
- goals, interests, seeking_connections (JSONB)
- privacy_settings (JSONB)
- profile_completed

### `feedback`
- id, user_id (FK)
- feedback_text, feedback_type
- page_context, status
- created_at

## 🔧 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists
- Restart dev server after adding env vars
- Verify no typos in variable names

### "Rate limit exceeded"
- Wait for the time window to reset
- Or clear the rate limit store (restart dev server)

### "Email already exists"
- User already registered
- Check Supabase → Table Editor → users

### "Failed to upload contacts"
- Check CSV format (headers: Full Name, Email, Position, Company)
- Check file size < 10MB
- Check Supabase → user_contacts table

### "OpenAI API quota exceeded"
- Check OpenAI dashboard for usage
- Add billing if needed
- Or disable email generation temporarily

## 🎨 Connecting to Your UI

### Client-Side API Calls

Example from a React component:

```typescript
// Register
const handleRegister = async (email: string, password: string, name: string) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name: name,
      organization: ''
    })
  })

  const data = await response.json()

  if (data.success) {
    // Registration successful
    console.log('User created:', data.user)
  } else {
    // Show error
    console.error(data.message)
  }
}

// Login
const handleLogin = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await response.json()

  if (data.success) {
    // Save user to state/context
    setUser(data.user)
    localStorage.setItem('user', JSON.stringify(data.user))
  }
}

// Upload CSV
const handleUpload = async (file: File, userId: string) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('userId', userId)

  const response = await fetch('/api/contacts/upload', {
    method: 'POST',
    body: formData
  })

  const data = await response.json()
  console.log('Uploaded:', data.count, 'contacts')
}

// Search
const handleSearch = async (query: string, userId: string) => {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      query,
      searchExtended: false
    })
  })

  const data = await response.json()
  setResults(data.results)
}
```

## 📈 Next Steps

1. ✅ **Test all API endpoints** locally
2. ✅ **Connect your UI components** to the API routes
3. ✅ **Deploy to Vercel**
4. ✅ **Test in production**
5. ⚠️  **Set up email sending** (for verification and notifications)
6. ⚠️  **Add monitoring** (Sentry, LogRocket)
7. ⚠️  **Set up analytics** (Vercel Analytics, PostHog)

## 💡 Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Test user registration flow
- [ ] Test login flow
- [ ] Test contact upload
- [ ] Test search (my network)
- [ ] Test search (extended network)
- [ ] Test connection requests
- [ ] Test profile creation/editing
- [ ] Test email generation
- [ ] Monitor Supabase dashboard for errors
- [ ] Monitor Vercel logs for errors
- [ ] Set up error tracking (Sentry recommended)

## 🚨 Security Notes

⚠️  **Never commit `.env.local` to git** (it's in .gitignore)
⚠️  **Never expose service role key** to client-side code
⚠️  **Monitor rate limiting** - adjust if needed
⚠️  **Review security logs** regularly
⚠️  **Keep dependencies updated** (npm audit)

## 🎉 You're Done!

Your backend is fully set up and secured. The Streamlit app and Next.js app can now run in parallel, both using the same Supabase database.

**Current Setup:**
- ✅ Streamlit app: `6thdegree.streamlit.app`
- ✅ Next.js app: `your-app.vercel.app`
- ✅ Both using: Same Supabase database

No conflicts, no data loss, no downtime! 🚀

---

Need help? Check the existing documentation or review the API code in `app/api/`.

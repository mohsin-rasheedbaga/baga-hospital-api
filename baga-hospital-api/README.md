# BAGA Hospital API

Backend API for BAGA Hospital Management System. Deployed on Vercel, connected to Supabase.

## API Endpoints

- `POST /api/license/check` - Validate license key
- `POST /api/auth/login` - User authentication
- `GET /api/health` - Health check

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |

---
Task ID: 1
Agent: main
Task: Fix git, add new features, rebrand to BAGA, push to GitHub

Work Log:
- Deleted broken /home/z/my-project/uwh-admin and re-cloned from GitHub
- Explored full codebase structure (Next.js 16, single page.tsx app, 3 API routes)
- Created /api/admin/migrate endpoint for database schema migration
- Updated License interface in supabase.ts with new fields (address, license_duration, expiry_date, check_frequency_days, warn_days_before)
- Removed hardcoded secrets from source code (moved to .env.local)
- Updated /api/admin/licenses/route.ts: BAGA prefix, auto-calculate expiry_date, search by address
- Updated /api/admin/licenses/[id]/route.ts: auto-calculate expiry on duration change
- Rewrote page.tsx: License duration selector, Address field, check frequency, warn days, expiry warnings, lifetime badge, logo file picker, BAGA branding
- Updated layout.tsx: BAGA title, lang="en"
- Updated package.json: name changed to baga-hospital-system
- Built successfully, committed and pushed to GitHub

Stage Summary:
- All code changes pushed to https://github.com/mohsin-rasheedbaga/Baga-Hospital-system
- .env.local created with real Supabase credentials (not in git)
- Migration SQL needs to be run manually in Supabase Dashboard SQL Editor
- Vercel needs env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD

-- ============================================================
-- BAGA Hospital - COMPLETE Supabase Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- This will:
--   1. Add missing columns to 'licenses' table
--   2. Create 'hospital_users' table (if not exists)
--   3. Verify everything is ready
-- ============================================================

-- STEP 1: Add missing columns to 'licenses' table
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS hospital_name TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_key TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_duration TEXT DEFAULT '1month';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '["all"]';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS check_frequency_days INTEGER DEFAULT 1;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS machine_id TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS warn_days_before INTEGER DEFAULT 3;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make sure hospital_name and license_key have values
UPDATE licenses SET hospital_name = 'BAGA Hospital' WHERE hospital_name IS NULL;
UPDATE licenses SET status = 'active' WHERE status IS NULL;
UPDATE licenses SET features = '["all"]'::jsonb WHERE features IS NULL;

-- STEP 2: Create hospital_users table (if not exists)
CREATE TABLE IF NOT EXISTS hospital_users (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Check if there's already a user for each hospital
-- If not, create a default admin user for the first hospital
DO $$
DECLARE
  v_hospital_id BIGINT;
  v_user_exists BOOLEAN;
BEGIN
  -- Get first active hospital
  SELECT id INTO v_hospital_id FROM licenses WHERE status = 'active' LIMIT 1;

  IF v_hospital_id IS NOT NULL THEN
    -- Check if user already exists for this hospital
    SELECT EXISTS(
      SELECT 1 FROM hospital_users WHERE hospital_id = v_hospital_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
      -- Create default admin user (username: admin, password: admin123)
      INSERT INTO hospital_users (hospital_id, full_name, username, password, role)
      VALUES (v_hospital_id, 'Admin User', 'admin', 'admin123', 'admin');

      RAISE NOTICE 'Created default admin user for hospital %', v_hospital_id;
    ELSE
      RAISE NOTICE 'Hospital users already exist for hospital %', v_hospital_id;
    END IF;
  ELSE
    RAISE NOTICE 'No active hospital found. Please create a license first.';
  END IF;
END $$;

-- STEP 4: Show current state
SELECT 'licenses' as table_name, count(*) as row_count FROM licenses
UNION ALL
SELECT 'hospital_users', count(*) FROM hospital_users;

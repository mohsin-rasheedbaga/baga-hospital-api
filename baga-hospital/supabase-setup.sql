-- =============================================
-- BAGA Hospital - Run this in Supabase SQL Editor
-- =============================================

-- 0. licenses table (CREATE THIS FIRST)
CREATE TABLE IF NOT EXISTS licenses (
  id BIGSERIAL PRIMARY KEY,
  hospital_name TEXT NOT NULL,
  license_key TEXT UNIQUE NOT NULL,
  license_duration TEXT DEFAULT '1month',
  status TEXT DEFAULT 'active',
  features JSONB DEFAULT '["all"]',
  address TEXT,
  phone TEXT,
  email TEXT,
  check_frequency_days INTEGER DEFAULT 1,
  expiry_date DATE,
  machine_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. hospital_users
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

-- =============================================
-- INSERT A DEMO LICENSE + USER (remove after testing)
-- =============================================
INSERT INTO licenses (hospital_name, license_key, license_duration, status, features, address, phone)
VALUES (
  'BAGA Hospital',
  'BAGA-DEMO-2024-TEST',
  'lifetime',
  'active',
  '["all"]'::jsonb,
  'Main Street, City',
  '0300-1234567'
)
ON CONFLICT (license_key) DO NOTHING;

-- Insert demo user (password: admin123)
INSERT INTO hospital_users (hospital_id, full_name, username, password, role)
SELECT id, 'Admin User', 'admin', 'admin123', 'admin'
FROM licenses WHERE license_key = 'BAGA-DEMO-2024-TEST'
ON CONFLICT (username) DO NOTHING;

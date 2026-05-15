-- BAGA Hospital Management System - Database Schema

-- 1. hospital_users (login credentials per hospital)
CREATE TABLE IF NOT EXISTS hospital_users (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  phone TEXT, email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. doctors
CREATE TABLE IF NOT EXISTS doctors (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  user_id BIGINT REFERENCES hospital_users(id),
  full_name TEXT NOT NULL,
  specialization TEXT,
  qualification TEXT,
  phone TEXT,
  consultation_fee INTEGER DEFAULT 0,
  hospital_sharing_percent INTEGER DEFAULT 30,
  doctor_sharing_percent INTEGER DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. patients
CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  patient_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  phone TEXT,
  address TEXT,
  blood_group TEXT,
  cnic TEXT,
  emergency_contact TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. visits
CREATE TABLE IF NOT EXISTS visits (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  patient_id BIGINT REFERENCES patients(id),
  visit_id TEXT UNIQUE NOT NULL,
  visit_type TEXT DEFAULT 'opd',
  doctor_id BIGINT REFERENCES doctors(id),
  emergency_fee INTEGER DEFAULT 0,
  consultation_fee INTEGER DEFAULT 0,
  total_fee INTEGER DEFAULT 0,
  hospital_charges INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  visit_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  visit_id BIGINT REFERENCES visits(id),
  patient_id BIGINT REFERENCES patients(id),
  doctor_id BIGINT REFERENCES doctors(id),
  rx_id TEXT UNIQUE NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  is_printed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. prescription_medicines
CREATE TABLE IF NOT EXISTS prescription_medicines (
  id BIGSERIAL PRIMARY KEY,
  prescription_id BIGINT REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration_days INTEGER DEFAULT 1,
  instructions TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. lab_test_catalog
CREATE TABLE IF NOT EXISTS lab_test_catalog (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  test_name TEXT NOT NULL,
  test_code TEXT UNIQUE,
  category TEXT,
  price INTEGER DEFAULT 0,
  report_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. lab_orders
CREATE TABLE IF NOT EXISTS lab_orders (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  visit_id BIGINT REFERENCES visits(id),
  patient_id BIGINT REFERENCES patients(id),
  doctor_id BIGINT REFERENCES doctors(id),
  order_id TEXT UNIQUE NOT NULL,
  test_ids TEXT[] NOT NULL,
  status TEXT DEFAULT 'pending',
  total_price INTEGER DEFAULT 0,
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. lab_reports
CREATE TABLE IF NOT EXISTS lab_reports (
  id BIGSERIAL PRIMARY KEY,
  lab_order_id BIGINT REFERENCES lab_orders(id),
  hospital_id BIGINT REFERENCES licenses(id),
  patient_id BIGINT REFERENCES patients(id),
  test_id BIGINT REFERENCES lab_test_catalog(id),
  test_name TEXT NOT NULL,
  result_values JSONB DEFAULT '[]',
  remarks TEXT,
  technician_id BIGINT REFERENCES hospital_users(id),
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. surgeries
CREATE TABLE IF NOT EXISTS surgeries (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  visit_id BIGINT REFERENCES visits(id),
  patient_id BIGINT REFERENCES patients(id),
  doctor_id BIGINT REFERENCES doctors(id),
  surgery_id TEXT UNIQUE NOT NULL,
  surgery_type TEXT,
  surgery_name TEXT NOT NULL,
  doctor_fee INTEGER DEFAULT 0,
  hospital_charges INTEGER DEFAULT 0,
  total_charges INTEGER DEFAULT 0,
  includes_hospital_charges BOOLEAN DEFAULT false,
  surgery_date DATE,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. payments
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  patient_id BIGINT REFERENCES patients(id),
  visit_id BIGINT REFERENCES visits(id),
  payment_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  payment_type TEXT,
  payment_method TEXT,
  received_by BIGINT REFERENCES hospital_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. discharges
CREATE TABLE IF NOT EXISTS discharges (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  visit_id BIGINT REFERENCES visits(id),
  patient_id BIGINT REFERENCES patients(id),
  doctor_id BIGINT REFERENCES doctors(id),
  discharge_id TEXT UNIQUE NOT NULL,
  discharge_date TIMESTAMPTZ DEFAULT NOW(),
  diagnosis TEXT,
  summary TEXT,
  follow_up_date DATE,
  total_bill INTEGER DEFAULT 0,
  total_paid INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. employees
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  user_id BIGINT REFERENCES hospital_users(id),
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  cnic TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  basic_salary INTEGER DEFAULT 0,
  monthly_leaves INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. salary_records
CREATE TABLE IF NOT EXISTS salary_records (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  employee_id BIGINT REFERENCES employees(id),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  basic_salary INTEGER DEFAULT 0,
  leaves_taken INTEGER DEFAULT 0,
  leave_deduction INTEGER DEFAULT 0,
  bonuses INTEGER DEFAULT 0,
  deductions INTEGER DEFAULT 0,
  net_salary INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paid_by BIGINT REFERENCES hospital_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- 15. doctor_fee_records
CREATE TABLE IF NOT EXISTS doctor_fee_records (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  doctor_id BIGINT REFERENCES doctors(id),
  visit_id BIGINT REFERENCES visits(id),
  patient_id BIGINT REFERENCES patients(id),
  total_fee INTEGER NOT NULL,
  hospital_share INTEGER DEFAULT 0,
  doctor_share INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. staff_notes
CREATE TABLE IF NOT EXISTS staff_notes (
  id BIGSERIAL PRIMARY KEY,
  hospital_id BIGINT REFERENCES licenses(id),
  patient_id BIGINT REFERENCES patients(id),
  visit_id BIGINT REFERENCES visits(id),
  staff_id BIGINT REFERENCES hospital_users(id),
  note_type TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

export interface HospitalUser {
  id: number;
  hospital_id: number;
  full_name: string;
  username: string;
  role: 'admin' | 'doctor' | 'reception' | 'lab' | 'pharmacy' | 'hr' | 'staff';
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

export interface Doctor {
  id: number;
  hospital_id: number;
  user_id?: number;
  full_name: string;
  specialization?: string;
  qualification?: string;
  phone?: string;
  consultation_fee: number;
  hospital_sharing_percent: number;
  doctor_sharing_percent: number;
  is_active: boolean;
  created_at: string;
}

export interface Patient {
  id: number;
  hospital_id: number;
  patient_id: string;
  full_name: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  blood_group?: string;
  cnic?: string;
  emergency_contact?: string;
  is_active: boolean;
  created_at: string;
}

export interface Visit {
  id: number;
  hospital_id: number;
  patient_id: number;
  visit_id: string;
  visit_type: 'opd' | 'emergency' | 'followup';
  doctor_id?: number;
  emergency_fee: number;
  consultation_fee: number;
  total_fee: number;
  hospital_charges: number;
  status: 'active' | 'discharged';
  visit_date: string;
  notes?: string;
  created_at: string;
  // Joined data
  patient?: Patient;
  doctor?: Doctor;
}

export interface Prescription {
  id: number;
  hospital_id: number;
  visit_id: number;
  patient_id: number;
  doctor_id: number;
  rx_id: string;
  diagnosis?: string;
  notes?: string;
  is_printed: boolean;
  created_at: string;
  medicines?: PrescriptionMedicine[];
  patient?: Patient;
  doctor?: Doctor;
}

export interface PrescriptionMedicine {
  id: number;
  prescription_id: number;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration_days: number;
  instructions?: string;
  quantity: number;
  created_at: string;
}

export interface LabTestCatalog {
  id: number;
  hospital_id: number;
  test_name: string;
  test_code?: string;
  category?: string;
  price: number;
  report_days: number;
  is_active: boolean;
  created_at: string;
}

export interface LabOrder {
  id: number;
  hospital_id: number;
  visit_id: number;
  patient_id: number;
  doctor_id?: number;
  order_id: string;
  test_ids: number[];
  status: 'pending' | 'in_progress' | 'completed';
  total_price: number;
  ordered_at: string;
  completed_at?: string;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
  reports?: LabReport[];
}

export interface LabReport {
  id: number;
  lab_order_id: number;
  hospital_id: number;
  patient_id: number;
  test_id: number;
  test_name: string;
  result_values: Array<{ parameter: string; value: string; unit: string; range: string }>;
  remarks?: string;
  technician_id?: number;
  status: 'pending' | 'completed';
  completed_at?: string;
  created_at: string;
}

export interface Surgery {
  id: number;
  hospital_id: number;
  visit_id: number;
  patient_id: number;
  doctor_id: number;
  surgery_id: string;
  surgery_type?: string;
  surgery_name: string;
  doctor_fee: number;
  hospital_charges: number;
  total_charges: number;
  includes_hospital_charges: boolean;
  surgery_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Payment {
  id: number;
  hospital_id: number;
  patient_id: number;
  visit_id: number;
  payment_id: string;
  amount: number;
  payment_type?: string;
  payment_method?: string;
  received_by?: number;
  notes?: string;
  created_at: string;
}

export interface Discharge {
  id: number;
  hospital_id: number;
  visit_id: number;
  patient_id: number;
  doctor_id: number;
  discharge_id: string;
  discharge_date: string;
  diagnosis?: string;
  summary?: string;
  follow_up_date?: string;
  total_bill: number;
  total_paid: number;
  balance: number;
  status: 'draft' | 'final';
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Employee {
  id: number;
  hospital_id: number;
  user_id?: number;
  employee_id: string;
  full_name: string;
  designation: string;
  department?: string;
  phone?: string;
  email?: string;
  cnic?: string;
  joining_date: string;
  basic_salary: number;
  monthly_leaves: number;
  is_active: boolean;
  created_at: string;
}

export interface SalaryRecord {
  id: number;
  hospital_id: number;
  employee_id: number;
  month: string;
  year: number;
  basic_salary: number;
  leaves_taken: number;
  leave_deduction: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  paid_at?: string;
  paid_by?: number;
  notes?: string;
  created_at: string;
  employee?: Employee;
}

export interface DoctorFeeRecord {
  id: number;
  hospital_id: number;
  doctor_id: number;
  visit_id: number;
  patient_id: number;
  total_fee: number;
  hospital_share: number;
  doctor_share: number;
  status: 'pending' | 'settled';
  settled_at?: string;
  created_at: string;
  patient?: Patient;
}

export interface StaffNote {
  id: number;
  hospital_id: number;
  patient_id: number;
  visit_id: number;
  staff_id: number;
  note_type: 'general' | 'xray' | 'report' | 'observation';
  content: string;
  created_at: string;
}

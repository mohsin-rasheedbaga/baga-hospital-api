export interface Patient {
  id: string;
  patientNo: string;
  name: string;
  fatherName: string;
  relation: 'S/O' | 'W/O' | 'D/O';
  mobile: string;
  age: number;
  gender: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastVisit: string;
  totalVisits: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  status: 'available' | 'busy' | 'off-duty';
  patientsToday: number;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  patientName: string;
  testType: string;
  status: 'pending' | 'in-progress' | 'completed';
  orderedAt: string;
  result: string;
  doctor: string;
}

export interface Visit {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  type: 'new' | 'follow-up';
  complaints: string;
  diagnosis: string;
  fee: number;
  status: 'completed' | 'pending';
}

export interface Payment {
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  type: string;
  date: string;
  status: 'paid' | 'pending' | 'partial';
}

export interface XRayOrder {
  id: string;
  patientName: string;
  testType: string;
  status: 'pending' | 'in-progress' | 'completed';
  orderedAt: string;
  result: string;
  doctor: string;
}

export interface UltrasoundOrder {
  id: string;
  patientName: string;
  testType: string;
  status: 'pending' | 'in-progress' | 'completed';
  orderedAt: string;
  result: string;
  doctor: string;
}

export const INIT_PATIENTS: Patient[] = [
  { id: '1', patientNo: 'BAGA-0001', name: 'محمد احمد خان', fatherName: 'عبدالرحمن خان', relation: 'S/O', mobile: '03001234567', age: 45, gender: 'Male', address: 'محلہ فیصل آباد، لاہور', status: 'active', createdAt: '2025-01-15', lastVisit: '2025-05-14', totalVisits: 8 },
  { id: '2', patientNo: 'BAGA-0002', name: 'فاطمہ بی بی', fatherName: 'محمد عارف', relation: 'W/O', mobile: '03012345678', age: 32, gender: 'Female', address: 'سکھر، سندھ', status: 'active', createdAt: '2025-02-01', lastVisit: '2025-05-13', totalVisits: 5 },
  { id: '3', patientNo: 'BAGA-0003', name: 'بلال حسین', fatherName: 'حسین علی', relation: 'S/O', mobile: '03023456789', age: 28, gender: 'Male', address: 'گلستانِ جوہر، کراچی', status: 'active', createdAt: '2025-02-10', lastVisit: '2025-05-12', totalVisits: 3 },
  { id: '4', patientNo: 'BAGA-0004', name: 'عائشہ صدیقی', fatherName: 'عبدالصدیق', relation: 'D/O', mobile: '03034567890', age: 22, gender: 'Female', address: 'ملیر، کراچی', status: 'active', createdAt: '2025-03-05', lastVisit: '2025-05-10', totalVisits: 2 },
  { id: '5', patientNo: 'BAGA-0005', name: 'اسلم ملک', fatherName: 'نعیم ملک', relation: 'S/O', mobile: '03045678901', age: 55, gender: 'Male', address: 'ریجنل بھٹاہ، راولپنڈی', status: 'active', createdAt: '2025-03-15', lastVisit: '2025-05-14', totalVisits: 12 },
  { id: '6', patientNo: 'BAGA-0006', name: 'نرگس بی بی', fatherName: 'غلام حسین', relation: 'W/O', mobile: '03056789012', age: 60, gender: 'Female', address: 'پشاور، خیبر پختونخوا', status: 'active', createdAt: '2025-03-20', lastVisit: '2025-05-11', totalVisits: 7 },
  { id: '7', patientNo: 'BAGA-0007', name: 'کامران شاہ', fatherName: 'شاہ محمد', relation: 'S/O', mobile: '03067890123', age: 35, gender: 'Male', address: 'کوئٹہ، بلوچستان', status: 'active', createdAt: '2025-04-01', lastVisit: '2025-05-13', totalVisits: 4 },
  { id: '8', patientNo: 'BAGA-0008', name: 'صائمہ اکرم', fatherName: 'اکرم حسین', relation: 'D/O', mobile: '03078901234', age: 18, gender: 'Female', address: 'فیصل آباد، پنجاب', status: 'active', createdAt: '2025-04-10', lastVisit: '2025-05-09', totalVisits: 1 },
  { id: '9', patientNo: 'BAGA-0009', name: 'ظہیر احمد', fatherName: 'احمد داد', relation: 'S/O', mobile: '03089012345', age: 42, gender: 'Male', address: 'ملتان، پنجاب', status: 'inactive', createdAt: '2025-01-20', lastVisit: '2025-04-15', totalVisits: 6 },
  { id: '10', patientNo: 'BAGA-0010', name: 'شکیل رضا', fatherName: 'رضا علی', relation: 'S/O', mobile: '03090123456', age: 50, gender: 'Male', address: 'حیدرآباد، سندھ', status: 'active', createdAt: '2025-04-20', lastVisit: '2025-05-14', totalVisits: 3 },
];

export const INIT_DOCTORS: Doctor[] = [
  { id: '1', name: 'Dr. Ahmad Raza', specialty: 'General Physician', phone: '0321-1234567', status: 'available', patientsToday: 8 },
  { id: '2', name: 'Dr. Sara Khan', specialty: 'Gynecology', phone: '0322-2345678', status: 'available', patientsToday: 5 },
  { id: '3', name: 'Dr. Umar Farooq', specialty: 'Orthopedics', phone: '0323-3456789', status: 'busy', patientsToday: 12 },
  { id: '4', name: 'Dr. Nida Hussain', specialty: 'ENT Specialist', phone: '0324-4567890', status: 'available', patientsToday: 3 },
  { id: '5', name: 'Dr. Aamir Ali', specialty: 'Cardiologist', phone: '0325-5678901', status: 'off-duty', patientsToday: 0 },
];

export const INIT_MEDICINES: Medicine[] = [
  { id: '1', name: 'Penicillin V 500mg', genericName: 'Penicillin V', category: 'Antibiotic', price: 50, stock: 250, unit: 'Capsule' },
  { id: '2', name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'Painkiller', price: 15, stock: 500, unit: 'Tablet' },
  { id: '3', name: 'Amoxicillin 250mg', genericName: 'Amoxicillin', category: 'Antibiotic', price: 80, stock: 180, unit: 'Capsule' },
  { id: '4', name: 'Omeprazole 20mg', genericName: 'Omeprazole', category: 'Stomach', price: 120, stock: 150, unit: 'Capsule' },
  { id: '5', name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Allergy', price: 30, stock: 300, unit: 'Tablet' },
  { id: '6', name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'BP', price: 60, stock: 200, unit: 'Tablet' },
  { id: '7', name: 'Metformin 500mg', genericName: 'Metformin', category: 'Sugar', price: 45, stock: 400, unit: 'Tablet' },
  { id: '8', name: 'Insulin Glargine', genericName: 'Insulin', category: 'Sugar', price: 800, stock: 30, unit: 'Injection' },
  { id: '9', name: 'Loperamide 2mg', genericName: 'Loperamide', category: 'Diarrhea', price: 25, stock: 350, unit: 'Capsule' },
  { id: '10', name: 'Cephalexin 500mg', genericName: 'Cephalexin', category: 'Antibiotic', price: 70, stock: 170, unit: 'Capsule' },
];

export const INIT_LAB_TESTS: LabTest[] = [
  { id: '1', patientId: '1', patientName: 'محمد احمد خان', testType: 'CBC', status: 'completed', orderedAt: '2025-05-14 09:30', result: 'WBC: 7500, RBC: 4.8M, Hb: 14.2g/dL', doctor: 'Dr. Ahmad Raza' },
  { id: '2', patientId: '2', patientName: 'فاطمہ بی بی', testType: 'Blood Sugar (Fasting)', status: 'completed', orderedAt: '2025-05-13 10:00', result: '110 mg/dL (Normal)', doctor: 'Dr. Sara Khan' },
  { id: '3', patientId: '3', patientName: 'بلال حسین', testType: 'Urine DR', status: 'in-progress', orderedAt: '2025-05-14 11:15', result: '', doctor: 'Dr. Ahmad Raza' },
  { id: '4', patientId: '5', patientName: 'اسلم ملک', testType: 'Liver Function Test', status: 'completed', orderedAt: '2025-05-14 08:00', result: 'ALT: 45, AST: 38, Bilirubin: 1.1', doctor: 'Dr. Aamir Ali' },
  { id: '5', patientId: '6', patientName: 'نرگس بی بی', testType: 'Kidney Function Test', status: 'pending', orderedAt: '2025-05-14 12:00', result: '', doctor: 'Dr. Ahmad Raza' },
  { id: '6', patientId: '10', patientName: 'شکیل رضا', testType: 'ESR', status: 'in-progress', orderedAt: '2025-05-14 10:30', result: '', doctor: 'Dr. Ahmad Raza' },
];

export const INIT_VISITS: Visit[] = [
  { id: '1', patientId: '1', patientName: 'محمد احمد خان', doctorId: '1', doctorName: 'Dr. Ahmad Raza', date: '2025-05-14', type: 'follow-up', complaints: 'Bukhar aur gale mein dard', diagnosis: 'Upper Respiratory Infection', fee: 1500, status: 'completed' },
  { id: '2', patientId: '2', patientName: 'فاطمہ بی بی', doctorId: '2', doctorName: 'Dr. Sara Khan', date: '2025-05-13', type: 'follow-up', complaints: 'Pet mein dard', diagnosis: 'Gastritis', fee: 2000, status: 'completed' },
  { id: '3', patientId: '5', patientName: 'اسلم ملک', doctorId: '5', doctorName: 'Dr. Aamir Ali', date: '2025-05-14', type: 'new', complaints: 'Seene mein dard aur saans ki tangi', diagnosis: 'Ischemic Heart Disease', fee: 3000, status: 'completed' },
  { id: '4', patientId: '3', patientName: 'بلال حسین', doctorId: '1', doctorName: 'Dr. Ahmad Raza', date: '2025-05-12', type: 'new', complaints: 'Chhale aur uljan', diagnosis: 'Urticaria', fee: 1500, status: 'completed' },
  { id: '5', patientId: '10', patientName: 'شکیل رضا', doctorId: '1', doctorName: 'Dr. Ahmad Raza', date: '2025-05-14', type: 'follow-up', complaints: 'Dard mufassal', diagnosis: 'Osteoarthritis', fee: 1500, status: 'completed' },
];

export const INIT_PAYMENTS: Payment[] = [
  { id: '1', patientId: '1', patientName: 'محمد احمد خان', amount: 1500, type: 'Consultation', date: '2025-05-14', status: 'paid' },
  { id: '2', patientId: '2', patientName: 'فاطمہ بی بی', amount: 2000, type: 'Consultation', date: '2025-05-13', status: 'paid' },
  { id: '3', patientId: '5', patientName: 'اسلم ملک', amount: 3000, type: 'Consultation', date: '2025-05-14', status: 'paid' },
  { id: '4', patientId: '5', patientName: 'اسلم ملک', amount: 500, type: 'Lab', date: '2025-05-14', status: 'paid' },
  { id: '5', patientId: '1', patientName: 'محمد احمد خان', amount: 800, type: 'Lab', date: '2025-05-14', status: 'pending' },
  { id: '6', patientId: '3', patientName: 'بلال حسین', amount: 400, type: 'Lab', date: '2025-05-14', status: 'pending' },
  { id: '7', patientId: '7', patientName: 'کامران شاہ', amount: 2000, type: 'X-Ray', date: '2025-05-14', status: 'partial' },
  { id: '8', patientId: '2', patientName: 'فاطمہ بی بی', amount: 1500, type: 'Pharmacy', date: '2025-05-13', status: 'paid' },
];

export const INIT_XRAY: XRayOrder[] = [
  { id: '1', patientName: 'کامران شاہ', testType: 'Chest X-Ray', status: 'in-progress', orderedAt: '2025-05-14 13:00', result: '', doctor: 'Dr. Umar Farooq' },
  { id: '2', patientName: 'اسلم ملک', testType: 'Knee X-Ray (Both)', status: 'completed', orderedAt: '2025-05-13 09:00', result: 'Mild osteoarthritic changes in both knees.', doctor: 'Dr. Umar Farooq' },
  { id: '3', patientName: 'ظہیر احمد', testType: 'Spine X-Ray', status: 'completed', orderedAt: '2025-04-15 14:00', result: 'L4-L5 disc space narrowing. Mild spondylosis.', doctor: 'Dr. Umar Farooq' },
];

export const INIT_ULTRASOUND: UltrasoundOrder[] = [
  { id: '1', patientName: 'فاطمہ بی بی', testType: 'Pelvic Ultrasound', status: 'completed', orderedAt: '2025-05-13 11:00', result: 'Normal uterus and ovaries. No abnormality detected.', doctor: 'Dr. Sara Khan' },
  { id: '2', patientName: 'نرگس بی بی', testType: 'Abdominal Ultrasound', status: 'pending', orderedAt: '2025-05-14 15:00', result: '', doctor: 'Dr. Aamir Ali' },
  { id: '3', patientName: 'عائشہ صدیقی', testType: 'Thyroid Ultrasound', status: 'pending', orderedAt: '2025-05-14 16:00', result: '', doctor: 'Dr. Nida Hussain' },
];

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Pill,
  Plus,
  X,
  Loader2,
  FlaskConical,
  Scissors,
  Save,
  CheckCircle2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VisitData {
  id: number;
  visit_id: string;
  visit_type: string;
  total_fee: number;
  consultation_fee: number;
  emergency_fee: number;
  hospital_charges: number;
  status: string;
  visit_date: string;
  notes?: string;
  doctor_id?: number;
  patient: {
    id: number;
    patient_id: string;
    full_name: string;
    age?: number;
    gender?: string;
    phone?: string;
    blood_group?: string;
  } | null;
  doctor: {
    id: number;
    full_name: string;
    specialization?: string;
    qualification?: string;
  } | null;
}

interface LabTest {
  id: number;
  test_name: string;
  test_code?: string;
  category?: string;
  price: number;
  report_days: number;
}

interface MedicineRow {
  key: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: string;
  instructions: string;
  quantity: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FREQUENCY_OPTIONS = [
  { value: '1-0-0', label: '1-0-0 Morning' },
  { value: '0-1-0', label: '0-1-0 Noon' },
  { value: '0-0-1', label: '0-0-1 Night' },
  { value: '1-1-0', label: '1-1-0 Morning+Noon' },
  { value: '1-0-1', label: '1-0-1 Morning+Night' },
  { value: '1-1-1', label: '1-1-1 All Day' },
  { value: 'SOS', label: 'SOS As Needed' },
];

const INSTRUCTION_OPTIONS = [
  'After Food',
  'Before Food',
  'With Water',
  'Empty Stomach',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let keyCounter = 0;
function nextKey() {
  return `med-${++keyCounter}`;
}

function emptyMedicine(): MedicineRow {
  return {
    key: nextKey(),
    medicine_name: '',
    dosage: '',
    frequency: '1-1-1',
    duration_days: '5',
    instructions: 'After Food',
    quantity: '1',
  };
}

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

const visitTypeColor: Record<string, string> = {
  opd: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  followup: 'bg-blue-50 text-blue-700 border-blue-200',
};

const visitTypeLabel: Record<string, string> = {
  opd: 'OPD',
  emergency: 'Emergency',
  followup: 'Follow-up',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PrescribePage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.visitId as string;

  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [visit, setVisit] = useState<VisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Diagnosis & Notes
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  // Medicines
  const [medicines, setMedicines] = useState<MedicineRow[]>([emptyMedicine()]);

  // Lab Tests
  const [orderLabTests, setOrderLabTests] = useState(false);
  const [labCatalog, setLabCatalog] = useState<LabTest[]>([]);
  const [selectedLabTests, setSelectedLabTests] = useState<number[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Surgery
  const [orderSurgery, setOrderSurgery] = useState(false);
  const [surgeryType, setSurgeryType] = useState('');
  const [surgeryName, setSurgeryName] = useState('');
  const [surgeryDoctorFee, setSurgeryDoctorFee] = useState('');
  const [surgeryHospitalCharges, setSurgeryHospitalCharges] = useState('');
  const [includesHospitalCharges, setIncludesHospitalCharges] =
    useState(false);

  /* ---- Fetch visit ---- */
  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const res = await fetch(`/api/visits/${visitId}`);
        const data = await res.json();
        if (res.ok) {
          setVisit(data.visit);
        } else {
          toast.error(data.error || 'Visit not found');
          router.push('/dashboard/doctor/patients');
        }
      } catch {
        toast.error('Failed to load visit');
        router.push('/dashboard/doctor/patients');
      } finally {
        setLoading(false);
      }
    };
    if (visitId) fetchVisit();
  }, [visitId, router]);

  /* ---- Fetch lab catalog ---- */
  useEffect(() => {
    if (!hospitalId) return;
    const fetchCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const res = await fetch(`/api/lab/catalog?hospital_id=${hospitalId}`);
        const data = await res.json();
        if (res.ok) setLabCatalog(data.tests || []);
      } catch {
        // silent
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, [hospitalId]);

  /* ---- Medicine handlers ---- */
  const addMedicine = () => setMedicines((prev) => [...prev, emptyMedicine()]);

  const removeMedicine = (key: string) =>
    setMedicines((prev) => prev.filter((m) => m.key !== key));

  const updateMedicine = (
    key: string,
    field: keyof MedicineRow,
    value: string | number
  ) => {
    setMedicines((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m))
    );
  };

  /* ---- Lab test handlers ---- */
  const toggleLabTest = (testId: number) => {
    setSelectedLabTests((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const selectedLabTotal = labCatalog
    .filter((t) => selectedLabTests.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);

  /* ---- Surgery total calc ---- */
  const surgeryTotal =
    (parseFloat(surgeryDoctorFee) || 0) +
    (parseFloat(surgeryHospitalCharges) || 0);

  /* ---- Save prescription ---- */
  const handleSave = async () => {
    if (!visit || !visit.patient || !visit.doctor) {
      toast.error('Visit data is incomplete');
      return;
    }

    const validMeds = medicines.filter((m) => m.medicine_name.trim());
    if (
      !diagnosis.trim() &&
      validMeds.length === 0 &&
      selectedLabTests.length === 0 &&
      !orderSurgery
    ) {
      toast.error(
        'Please add at least a diagnosis, medicine, lab test, or surgery'
      );
      return;
    }

    if (orderSurgery && !surgeryName.trim()) {
      toast.error('Surgery name is required when ordering surgery');
      return;
    }

    setSaving(true);
    try {
      // 1. Save prescription
      const rxPayload = {
        hospital_id: hospitalId,
        visit_id: visit.id,
        patient_id: visit.patient.id,
        doctor_id: visit.doctor.id,
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        medicines: validMeds.map((m) => ({
          medicine_name: m.medicine_name.trim(),
          dosage: m.dosage.trim() || null,
          frequency: m.frequency || null,
          duration_days: parseInt(m.duration_days, 10) || 1,
          instructions: m.instructions || null,
          quantity: parseInt(m.quantity, 10) || 1,
        })),
      };

      const rxRes = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rxPayload),
      });

      const rxData = await rxRes.json();
      if (!rxRes.ok) {
        toast.error(rxData.error || 'Failed to save prescription');
        return;
      }
      toast.success(
        `Prescription saved — ${rxData.prescription?.rx_id || 'RX'}`
      );

      // 2. Save lab orders
      if (orderLabTests && selectedLabTests.length > 0) {
        const labRes = await fetch('/api/lab-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hospital_id: hospitalId,
            visit_id: visit.id,
            patient_id: visit.patient.id,
            doctor_id: visit.doctor.id,
            test_ids: selectedLabTests,
          }),
        });

        const labData = await labRes.json();
        if (labRes.ok) {
          toast.success(
            `Lab order created — ${labData.order?.order_id || ''}`
          );
        } else {
          toast.error(labData.error || 'Lab order failed');
        }
      }

      // 3. Save surgery
      if (orderSurgery && surgeryName.trim()) {
        const surFee = parseFloat(surgeryDoctorFee) || 0;
        const hospChg = parseFloat(surgeryHospitalCharges) || 0;

        const surgRes = await fetch('/api/surgeries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hospital_id: hospitalId,
            visit_id: visit.id,
            patient_id: visit.patient.id,
            doctor_id: visit.doctor.id,
            surgery_type: surgeryType.trim() || null,
            surgery_name: surgeryName.trim(),
            doctor_fee: surFee,
            hospital_charges: hospChg,
            total_charges: surFee + hospChg,
            includes_hospital_charges: includesHospitalCharges,
          }),
        });

        const surgData = await surgRes.json();
        if (surgRes.ok) {
          toast.success(
            `Surgery ordered — ${surgData.surgery?.surgery_id || ''}`
          );
        } else {
          toast.error(surgData.error || 'Surgery order failed');
        }
      }

      setSuccess(true);
    } catch {
      toast.error('Something went wrong while saving');
    } finally {
      setSaving(false);
    }
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Prescription Saved Successfully!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {visit?.patient?.full_name} — {visit?.visit_id}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/doctor/patients')}
            >
              Back to Patients
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() =>
                router.push(
                  `/dashboard/doctor/history/${visit?.patient?.id}`
                )
              }
            >
              View Patient History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescription</h1>
          <p className="text-sm text-gray-500">
            {visit?.visit_id} — {visit?.patient?.full_name}
          </p>
        </div>
      </div>

      {/* Patient Info Card */}
      {visit && (
        <Card className="border-emerald-200">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-gray-900">
                  {visit.patient?.full_name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                  <span>
                    Age: {visit.patient?.age || 'N/A'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>Gender: {visit.patient?.gender || 'N/A'}</span>
                  {visit.patient?.blood_group && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        {visit.patient.blood_group}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {visit.visit_id}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${visitTypeColor[visit.visit_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                >
                  {visitTypeLabel[visit.visit_type] || visit.visit_type}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* A) Diagnosis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-900">A) Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter diagnosis..."
            rows={3}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* B) Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-900">B) Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Additional clinical notes..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* C) Medicines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base text-gray-900">
              <Pill className="h-5 w-5 text-emerald-600" /> C) Medicines
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={addMedicine}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Medicine
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {medicines.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              No medicines added. Click &quot;Add Medicine&quot; to start.
            </p>
          )}
          {medicines.map((med, idx) => (
            <div
              key={med.key}
              className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">
                  Medicine #{idx + 1}
                </span>
                {medicines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeMedicine(med.key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-gray-600">Medicine Name</Label>
                  <Input
                    placeholder="e.g., Paracetamol"
                    value={med.medicine_name}
                    onChange={(e) =>
                      updateMedicine(med.key, 'medicine_name', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Dosage</Label>
                  <Input
                    placeholder="500mg"
                    value={med.dosage}
                    onChange={(e) =>
                      updateMedicine(med.key, 'dosage', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Frequency</Label>
                  <Select
                    value={med.frequency || undefined}
                    onValueChange={(v) =>
                      updateMedicine(med.key, 'frequency', v || '1-1-1')
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">
                    Duration (days)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="5"
                    value={med.duration_days}
                    onChange={(e) =>
                      updateMedicine(med.key, 'duration_days', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Instructions</Label>
                  <Select
                    value={med.instructions}
                    onValueChange={(v) =>
                      updateMedicine(med.key, 'instructions', v || '')
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTRUCTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={med.quantity}
                    onChange={(e) =>
                      updateMedicine(med.key, 'quantity', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* D) Lab Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <FlaskConical className="h-5 w-5 text-emerald-600" /> D) Lab Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Checkbox
              checked={orderLabTests}
              onCheckedChange={(checked) => {
                setOrderLabTests(checked === true);
                if (checked !== true) setSelectedLabTests([]);
              }}
            />
            <span className="text-sm font-medium text-gray-700">
              Order Lab Tests
            </span>
          </label>

          {orderLabTests && (
            <>
              {loadingCatalog ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm text-gray-500">
                    Loading test catalog...
                  </span>
                </div>
              ) : labCatalog.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-lg">
                  No lab tests available in catalog
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1">
                  {labCatalog.map((test) => {
                    const isSelected = selectedLabTests.includes(test.id);
                    return (
                      <button
                        key={test.id}
                        type="button"
                        className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        onClick={() => toggleLabTest(test.id)}
                      >
                        <Checkbox checked={isSelected} readOnly />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {test.test_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {test.category || test.test_code || ''}
                            {test.report_days
                              ? ` | ${test.report_days} day(s)`
                              : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 shrink-0">
                          Rs. {test.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedLabTests.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <span className="text-sm text-gray-700">
                    {selectedLabTests.length} test(s) selected
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    Rs. {selectedLabTotal.toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* E) Surgery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Scissors className="h-5 w-5 text-emerald-600" /> E) Surgery{' '}
            <span className="text-xs font-normal text-gray-400">
              (Optional)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Checkbox
              checked={orderSurgery}
              onCheckedChange={(checked) => {
                setOrderSurgery(checked === true);
                if (checked !== true) {
                  setSurgeryType('');
                  setSurgeryName('');
                  setSurgeryDoctorFee('');
                  setSurgeryHospitalCharges('');
                  setIncludesHospitalCharges(false);
                }
              }}
            />
            <span className="text-sm font-medium text-gray-700">
              Order Surgery
            </span>
          </label>

          {orderSurgery && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="surgery_type" className="text-sm">
                    Surgery Type
                  </Label>
                  <Input
                    id="surgery_type"
                    placeholder="e.g., Minor, Major"
                    value={surgeryType}
                    onChange={(e) => setSurgeryType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgery_name" className="text-sm">
                    Surgery Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="surgery_name"
                    placeholder="e.g., Appendectomy"
                    value={surgeryName}
                    onChange={(e) => setSurgeryName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgery_doctor_fee" className="text-sm">
                    Doctor Fee (Rs.)
                  </Label>
                  <Input
                    id="surgery_doctor_fee"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={surgeryDoctorFee}
                    onChange={(e) => setSurgeryDoctorFee(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surgery_hospital_charges" className="text-sm">
                    Hospital Charges (Rs.)
                  </Label>
                  <Input
                    id="surgery_hospital_charges"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={surgeryHospitalCharges}
                    onChange={(e) => setSurgeryHospitalCharges(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={includesHospitalCharges}
                    onCheckedChange={setIncludesHospitalCharges}
                  />
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Includes Hospital Charges
                    </Label>
                    <p className="text-xs text-gray-400">
                      When ON, hospital charges are part of total surgery bill
                    </p>
                  </div>
                </div>
              </div>
              {surgeryTotal > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <span className="text-sm font-medium text-gray-700">
                    Total Surgery Charges
                  </span>
                  <span className="text-xl font-bold text-emerald-700">
                    Rs. {surgeryTotal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2 pb-8">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[180px]"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Save className="h-4 w-4 mr-2" />
          Save Prescription
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

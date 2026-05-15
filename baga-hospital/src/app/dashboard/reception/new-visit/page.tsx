'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ClipboardCheck, Loader2, Search, Plus, CheckCircle2 } from 'lucide-react';

interface Patient {
  id: number;
  patient_id: string;
  full_name: string;
  age?: number;
  gender?: string;
  phone?: string;
}

interface Doctor {
  id: number;
  full_name: string;
  specialization?: string;
  consultation_fee: number;
}

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

export default function NewVisitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [successVisitId, setSuccessVisitId] = useState<string | null>(null);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitType, setVisitType] = useState<'opd' | 'emergency' | 'followup'>('opd');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [emergencyFee, setEmergencyFee] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [hospitalCharges, setHospitalCharges] = useState('');
  const [notes, setNotes] = useState('');

  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;

  // Fetch doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!hospitalId) return;
      try {
        const res = await fetch(`/api/doctors?hospital_id=${hospitalId}`);
        const data = await res.json();
        if (res.ok) setDoctors(data.doctors || []);
      } catch {
        // silent
      }
    };
    fetchDoctors();
  }, [hospitalId]);

  // Search patients
  const searchPatients = useCallback(async (query: string) => {
    if (!hospitalId || !query.trim()) {
      setPatients([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/patients?hospital_id=${hospitalId}&search=${encodeURIComponent(query.trim())}&limit=10`);
      const data = await res.json();
      if (res.ok) setPatients(data.patients || []);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, searchPatients]);

  // Auto-fill consultation fee when doctor is selected
  const handleDoctorSelect = (value: string | null) => {
    const v = value || '';
    setSelectedDoctorId(v);
    if (v && visitType !== 'emergency') {
      const doctor = doctors.find((d) => d.id === parseInt(v, 10));
      if (doctor) setConsultationFee(String(doctor.consultation_fee || 0));
    }
  };

  // Calculate total fee
  const totalFee = (() => {
    let total = 0;
    if (visitType === 'emergency') {
      total += parseFloat(emergencyFee) || 0;
    } else {
      total += parseFloat(consultationFee) || 0;
    }
    total += parseFloat(hospitalCharges) || 0;
    return total;
  })();

  const resetForm = () => {
    setSelectedPatient(null);
    setVisitType('opd');
    setSelectedDoctorId('');
    setEmergencyFee('');
    setConsultationFee('');
    setHospitalCharges('');
    setNotes('');
    setPatientSearch('');
    setSuccessVisitId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        hospital_id: hospitalId,
        patient_id: selectedPatient.id,
        visit_type: visitType,
        hospital_charges: parseFloat(hospitalCharges) || 0,
        notes: notes.trim() || null,
      };

      if (visitType === 'emergency') {
        payload.emergency_fee = parseFloat(emergencyFee) || 0;
        payload.consultation_fee = 0;
      } else {
        payload.doctor_id = parseInt(selectedDoctorId, 10);
        payload.consultation_fee = parseFloat(consultationFee) || 0;
        payload.emergency_fee = 0;
      }

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create visit');
        return;
      }

      const vid = data.visit?.visit_id || 'Unknown';
      setSuccessVisitId(vid);
      toast.success(`Visit created successfully — ID: ${vid}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon-sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Visit</h1>
          <p className="text-sm text-gray-500">Register a new patient visit</p>
        </div>
      </div>

      {/* Success Banner */}
      {successVisitId && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">Visit created successfully!</p>
            <p className="text-sm text-emerald-600">Visit ID: <span className="font-mono font-semibold">{successVisitId}</span></p>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={resetForm}>
            <Plus className="h-4 w-4 mr-1" /> New Visit
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            Visit Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Search */}
            <div className="space-y-2">
              <Label>
                Select Patient <span className="text-red-500">*</span>
              </Label>
              {selectedPatient ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{selectedPatient.full_name}</p>
                    <p className="text-xs text-gray-500">
                      ID: {selectedPatient.patient_id} | Age: {selectedPatient.age || 'N/A'} | Phone: {selectedPatient.phone || 'N/A'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearch('');
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patient by name, ID, or phone..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="pl-10"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  {showPatientDropdown && patients.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                      {patients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                          onClick={() => {
                            setSelectedPatient(p);
                            setShowPatientDropdown(false);
                          }}
                        >
                          <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                          <p className="text-xs text-gray-500">
                            {p.patient_id} | {p.age ? `${p.age} yrs` : ''} | {p.phone || 'No phone'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Visit Type */}
            <div className="space-y-2">
              <Label>Visit Type <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-3">
                {(['opd', 'emergency', 'followup'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      visitType === type
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setVisitType(type);
                      if (type === 'emergency') {
                        setSelectedDoctorId('');
                        setConsultationFee('');
                      }
                    }}
                  >
                    {type === 'opd' && '🏥 OPD'}
                    {type === 'emergency' && '🚨 Emergency'}
                    {type === 'followup' && '🔄 Follow-up'}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Select (OPD / Follow-up) */}
            {(visitType === 'opd' || visitType === 'followup') && (
              <div className="space-y-2">
                <Label>
                  Select Doctor <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedDoctorId} onValueChange={handleDoctorSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.full_name} {d.specialization ? `— ${d.specialization}` : ''} (Rs. {d.consultation_fee})
                      </SelectItem>
                    ))}
                    {doctors.length === 0 && (
                      <SelectItem value="none" disabled>
                        No doctors available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Emergency Fee */}
            {visitType === 'emergency' && (
              <div className="space-y-2">
                <Label htmlFor="emergency_fee">Emergency Fee</Label>
                <Input
                  id="emergency_fee"
                  type="number"
                  min="0"
                  placeholder="Enter emergency fee"
                  value={emergencyFee}
                  onChange={(e) => setEmergencyFee(e.target.value)}
                />
              </div>
            )}

            {/* Consultation Fee (display for OPD/Follow-up) */}
            {(visitType === 'opd' || visitType === 'followup') && (
              <div className="space-y-2">
                <Label htmlFor="consultation_fee">Consultation Fee</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  min="0"
                  placeholder="Auto-filled from doctor"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                />
              </div>
            )}

            {/* Hospital Charges */}
            <div className="space-y-2">
              <Label htmlFor="hospital_charges">Hospital Charges</Label>
              <Input
                id="hospital_charges"
                type="number"
                min="0"
                placeholder="Enter hospital charges"
                value={hospitalCharges}
                onChange={(e) => setHospitalCharges(e.target.value)}
              />
            </div>

            {/* Total Fee Display */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Fee</span>
                <span className="text-2xl font-bold text-emerald-700">Rs. {totalFee.toLocaleString()}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes for this visit..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading || !selectedPatient}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Visit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

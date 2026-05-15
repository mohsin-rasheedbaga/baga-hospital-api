'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Activity,
  User,
  Stethoscope,
  Banknote,
  ShieldCheck,
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
  patient: {
    id: number;
    patient_id: string;
    full_name: string;
    age?: number;
    gender?: string;
    phone?: string;
  } | null;
  doctor: {
    id: number;
    full_name: string;
    specialization?: string;
  } | null;
}

interface VisitCharges {
  consultation_fee: number;
  emergency_fee: number;
  hospital_charges: number;
  total_fee: number;
  surgery_charges: number;
}

interface PaymentInfo {
  payments: PaymentRecord[];
  totalBill: number;
  totalPaid: number;
  balance: number;
  visitCharges: VisitCharges;
}

interface PaymentRecord {
  id: number;
  payment_id: string;
  amount: number;
  payment_method?: string;
  payment_type?: string;
  notes?: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

const visitTypeColor: Record<string, string> = {
  opd: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  followup: 'bg-blue-50 text-blue-700 border-blue-200',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DischargePage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.visitId as string;
  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [visit, setVisit] = useState<VisitData | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dischargeId, setDischargeId] = useState('');

  const [diagnosis, setDiagnosis] = useState('');
  const [summary, setSummary] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  /* ---- Fetch visit + payment info ---- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [visitRes, paymentRes] = await Promise.all([
          fetch(`/api/visits/${visitId}`),
          fetch(`/api/payments/visit/${visitId}`),
        ]);

        const visitData = await visitRes.json();
        const paymentData = await paymentRes.json();

        if (!visitRes.ok) {
          toast.error(visitData.error || 'Visit not found');
          router.push('/dashboard');
          return;
        }

        setVisit(visitData.visit);
        setPaymentInfo({
          payments: paymentData.payments || [],
          totalBill: paymentData.totalBill || 0,
          totalPaid: paymentData.totalPaid || 0,
          balance: paymentData.balance || 0,
          visitCharges: paymentData.visitCharges || {
            consultation_fee: 0,
            emergency_fee: 0,
            hospital_charges: 0,
            total_fee: 0,
            surgery_charges: 0,
          },
        });
      } catch {
        toast.error('Failed to load visit data');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (visitId) fetchData();
  }, [visitId, router]);

  /* ---- Submit discharge ---- */
  const handleSubmit = async () => {
    if (!visit || !visit.patient || !visit.doctor) {
      toast.error('Incomplete visit data');
      return;
    }

    if (!diagnosis.trim()) {
      toast.error('Diagnosis is required for discharge');
      return;
    }

    if (paymentInfo && paymentInfo.balance > 0) {
      toast.error(
        'Cannot discharge — outstanding balance must be cleared first'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/discharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          visit_id: visit.id,
          patient_id: visit.patient.id,
          doctor_id: visit.doctor.id,
          diagnosis: diagnosis.trim(),
          summary: summary.trim() || null,
          follow_up_date: followUpDate || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Discharge failed');
        return;
      }

      setDischargeId(data.discharge?.discharge_id || '');
      setSuccess(true);
      toast.success(
        `Patient discharged successfully — ${data.discharge?.discharge_id || 'DIS'}`
      );
    } catch {
      toast.error('Discharge failed due to a network error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
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
            Patient Discharged Successfully!
          </h2>
          <p className="text-sm text-gray-500 mb-1">
            {visit?.patient?.full_name}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Discharge ID:{' '}
            <span className="font-mono font-semibold text-emerald-700">
              {dischargeId}
            </span>
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
              onClick={() => window.print()}
            >
              Print Summary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasBalance = paymentInfo && paymentInfo.balance > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900">
            Discharge Patient
          </h1>
          <p className="text-sm text-gray-500">
            {visit?.visit_id} — {visit?.patient?.full_name}
          </p>
        </div>
      </div>

      {/* Patient & Doctor Info */}
      {visit && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Patient
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {visit.patient?.full_name}
              </p>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-1">
                <span>{visit.patient?.patient_id}</span>
                {visit.patient?.age && <span>| {visit.patient.age} yrs</span>}
                {visit.patient?.gender && (
                  <span>| {visit.patient.gender}</span>
                )}
              </div>
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className={
                    visitTypeColor[visit.visit_type] ||
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }
                >
                  {visit.visit_type.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Doctor
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {visit.doctor?.full_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {visit.doctor?.specialization || 'General'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Visit Date: {visit.visit_date}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Display */}
      {paymentInfo && (
        <Card className={hasBalance ? 'border-red-300 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Banknote
                className={`h-5 w-5 ${hasBalance ? 'text-red-500' : 'text-emerald-600'}`}
              />
              <h3 className="text-sm font-semibold text-gray-900">
                Payment Summary
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-white/80 p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Bill</p>
                <p className="text-xl font-bold text-gray-900">
                  Rs. {paymentInfo.totalBill.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-white/80 p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                <p className="text-xl font-bold text-emerald-600">
                  Rs. {paymentInfo.totalPaid.toLocaleString()}
                </p>
              </div>
              <div
                className={`rounded-lg p-3 border ${hasBalance ? 'bg-red-100 border-red-200' : 'bg-emerald-100 border-emerald-200'}`}
              >
                <p className="text-xs text-gray-500 mb-1">Balance</p>
                <p
                  className={`text-xl font-bold ${hasBalance ? 'text-red-600' : 'text-emerald-600'}`}
                >
                  Rs. {paymentInfo.balance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Charge Breakdown */}
            <div className="mt-4 pt-3 border-t border-gray-200/60">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Charge Breakdown
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Consultation Fee</span>
                  <span>
                    Rs.{' '}
                    {paymentInfo.visitCharges.consultation_fee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Emergency Fee</span>
                  <span>
                    Rs.{' '}
                    {paymentInfo.visitCharges.emergency_fee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Hospital Charges</span>
                  <span>
                    Rs.{' '}
                    {paymentInfo.visitCharges.hospital_charges.toLocaleString()}
                  </span>
                </div>
                {paymentInfo.visitCharges.surgery_charges > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Surgery Charges</span>
                    <span>
                      Rs.{' '}
                      {paymentInfo.visitCharges.surgery_charges.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Warning */}
      {hasBalance && (
        <div className="flex items-start gap-3 rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Outstanding Balance — Cannot Discharge
            </p>
            <p className="text-sm text-red-600 mt-1">
              Please collect the remaining payment of{' '}
              <strong>
                Rs. {paymentInfo!.balance.toLocaleString()}
              </strong>{' '}
              before discharging the patient. The discharge button will be
              enabled once the balance is cleared.
            </p>
          </div>
        </div>
      )}

      {/* Ready to Discharge */}
      {!hasBalance && paymentInfo && (
        <div className="flex items-start gap-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Payment Cleared — Ready for Discharge
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              All payments have been received. You can proceed with the
              discharge process below.
            </p>
          </div>
        </div>
      )}

      {/* Discharge Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-gray-900">
            Discharge Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discharge_diagnosis" className="text-sm">
              Diagnosis <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="discharge_diagnosis"
              placeholder="Final diagnosis at discharge..."
              rows={3}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discharge_summary" className="text-sm">
              Discharge Summary
            </Label>
            <Textarea
              id="discharge_summary"
              placeholder="Summary of treatment, condition at discharge, and recommendations..."
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow_up_date" className="text-sm">
              Follow-up Date
            </Label>
            <Input
              id="follow_up_date"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-400">
              Set a date if the patient needs to return for a follow-up visit
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 pb-8">
        <Button
          onClick={handleSubmit}
          disabled={submitting || !!hasBalance}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[180px]"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Activity className="h-4 w-4 mr-2" />
          Discharge Patient
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        {hasBalance && (
          <Button
            variant="outline"
            className="ml-auto text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => router.push('/dashboard/reception/payments')}
          >
            Collect Payment
          </Button>
        )}
      </div>
    </div>
  );
}

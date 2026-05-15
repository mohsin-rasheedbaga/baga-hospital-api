'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  CheckCircle2,
  Banknote,
  Wallet,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DoctorItem {
  id: number;
  full_name: string;
  specialization?: string;
  consultation_fee: number;
}

interface FeeRecord {
  id: number;
  visit_id: number;
  patient: {
    id: number;
    patient_id: string;
    full_name: string;
    phone?: string;
  } | null;
  total_fee: number;
  hospital_share: number;
  doctor_share: number;
  status: string;
  created_at: string;
}

interface DoctorFeesData {
  doctor: DoctorItem;
  total_pending: number;
  total_settled: number;
  records: FeeRecord[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DoctorSettlementPage() {
  const router = useRouter();
  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [feesData, setFeesData] = useState<DoctorFeesData | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingFees, setLoadingFees] = useState(false);
  const [settling, setSettling] = useState<number[]>([]);
  const [settlingAll, setSettlingAll] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  /* ---- Fetch doctors ---- */
  useEffect(() => {
    const load = async () => {
      if (!hospitalId) return;
      setLoadingDoctors(true);
      try {
        const res = await fetch(`/api/doctors?hospital_id=${hospitalId}`);
        const data = await res.json();
        if (res.ok) {
          setDoctors(data.doctors || []);
        } else {
          toast.error(data.error || 'Failed to fetch doctors');
        }
      } catch {
        toast.error('Failed to fetch doctors');
      } finally {
        setLoadingDoctors(false);
      }
    };
    load();
  }, [hospitalId]);

  /* ---- Fetch fee records when doctor selection or fetchKey changes ---- */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!selectedDoctorId) {
        setFeesData(null);
        return;
      }
      setLoadingFees(true);
      try {
        const res = await fetch(`/api/doctors/${selectedDoctorId}/fees`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setFeesData(data);
        } else {
          toast.error(data.error || 'Failed to fetch fees');
        }
      } catch {
        if (!cancelled) toast.error('Failed to fetch fees');
      } finally {
        if (!cancelled) setLoadingFees(false);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [selectedDoctorId, fetchKey]);

  const refetchFees = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  /* ---- Settle single record ---- */
  const settleSingle = async (recordId: number) => {
    if (!selectedDoctorId) return;
    setSettling((prev) => [...prev, recordId]);
    try {
      const res = await fetch(`/api/doctors/${selectedDoctorId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee_record_ids: [recordId] }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Fee record settled successfully');
        refetchFees();
      } else {
        toast.error(data.error || 'Settlement failed');
      }
    } catch {
      toast.error('Settlement failed');
    } finally {
      setSettling((prev) => prev.filter((id) => id !== recordId));
    }
  };

  /* ---- Settle all pending ---- */
  const settleAll = async () => {
    if (!selectedDoctorId || !feesData || feesData.records.length === 0)
      return;
    setSettlingAll(true);
    try {
      const allIds = feesData.records.map((r) => r.id);
      const res = await fetch(`/api/doctors/${selectedDoctorId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee_record_ids: allIds }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          `${data.settled_count} fee record(s) settled successfully`
        );
        refetchFees();
      } else {
        toast.error(data.error || 'Settlement failed');
      }
    } catch {
      toast.error('Settlement failed');
    } finally {
      setSettlingAll(false);
    }
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Doctor Fee Settlement
          </h1>
          <p className="text-sm text-gray-500">
            Manage and settle pending doctor consultation fees
          </p>
        </div>
      </div>

      {/* Doctor Select */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Select Doctor
              </label>
              {loadingDoctors ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 h-9">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading
                  doctors...
                </div>
              ) : (
                <Select
                  value={selectedDoctorId}
                  onValueChange={(v) => setSelectedDoctorId(v || '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a doctor to view fees" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.full_name}
                        {d.specialization
                          ? ` — ${d.specialization}`
                          : ''}
                      </SelectItem>
                    ))}
                    {doctors.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No doctors available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {feesData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Wallet className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  Rs. {feesData.total_pending.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  Rs. {feesData.total_settled.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Settled</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <CreditCard className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {feesData.records.length}
                </p>
                <p className="text-xs text-gray-500">Pending Records</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Fees Table */}
      {selectedDoctorId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base text-gray-900">
                <Banknote className="h-5 w-5 text-emerald-600" />
                Pending Fees — {feesData?.doctor?.full_name || ''}
                {feesData?.doctor?.specialization && (
                  <span className="text-xs text-gray-400 font-normal">
                    ({feesData.doctor.specialization})
                  </span>
                )}
              </span>
              {feesData && feesData.records.length > 0 && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={settleAll}
                  disabled={settlingAll}
                >
                  {settlingAll && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  )}
                  Settle All ({feesData.records.length})
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingFees ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : !feesData || feesData.records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <CheckCircle2 className="h-12 w-12 mb-4 text-emerald-300" />
                <p className="text-sm font-medium text-gray-600">
                  No pending fees
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  All fees have been settled for this doctor
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Visit ID
                      </TableHead>
                      <TableHead className="text-right">
                        Total Fee
                      </TableHead>
                      <TableHead className="text-right hidden md:table-cell">
                        Hospital Share
                      </TableHead>
                      <TableHead className="text-right">
                        Doctor Share
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Date
                      </TableHead>
                      <TableHead className="text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feesData.records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {record.patient?.full_name || 'Unknown'}
                            </p>
                            {record.patient?.phone && (
                              <p className="text-xs text-gray-500">
                                {record.patient.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-xs">
                          {record.visit_id}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          Rs. {record.total_fee.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell text-gray-500">
                          Rs. {record.hospital_share.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-emerald-700">
                          Rs. {record.doctor_share.toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {new Date(record.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => settleSingle(record.id)}
                            disabled={settling.includes(record.id)}
                          >
                            {settling.includes(record.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Banknote className="h-3.5 w-3.5 mr-1" />
                            )}
                            Settle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={2} className="text-sm text-gray-700">
                        Total
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        Rs.{' '}
                        {feesData.records
                          .reduce((sum, r) => sum + r.total_fee, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell text-gray-500">
                        Rs.{' '}
                        {feesData.records
                          .reduce((sum, r) => sum + r.hospital_share, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm text-emerald-700">
                        Rs.{' '}
                        {feesData.records
                          .reduce((sum, r) => sum + r.doctor_share, 0)
                          .toLocaleString()}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

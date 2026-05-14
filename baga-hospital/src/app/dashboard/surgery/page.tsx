'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  Activity,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  CircleDollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Building2,
  Syringe,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Surgery {
  id: number;
  surgery_id: string;
  patient: {
    id: number;
    patient_id: string;
    full_name: string;
    phone: string | null;
  } | null;
  doctor: {
    id: number;
    full_name: string;
  } | null;
  surgery_type: string | null;
  surgery_name: string;
  doctor_fee: number;
  hospital_charges: number;
  total_charges: number;
  includes_hospital_charges: boolean;
  surgery_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'scheduled':
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          Scheduled
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SurgeryPage() {
  const router = useRouter();
  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /* ---- Fetch surgeries ---- */
  useEffect(() => {
    let cancelled = false;
    if (!hospitalId) return;

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/surgeries?hospital_id=${hospitalId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.surgeries) setSurgeries(data.surgeries);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to fetch surgeries');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hospitalId]);

  /* ---- Filter ---- */
  const filtered =
    statusFilter === 'all'
      ? surgeries
      : surgeries.filter((s) => s.status === statusFilter);

  /* ---- Stats ---- */
  const totalSurgeries = surgeries.length;
  const scheduledCount = surgeries.filter(
    (s) => s.status === 'scheduled'
  ).length;
  const completedCount = surgeries.filter(
    (s) => s.status === 'completed'
  ).length;
  const totalRevenue = surgeries
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.total_charges, 0);

  /* ---- Toggle expand ---- */
  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
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
          <h1 className="text-2xl font-bold text-gray-900">Surgeries</h1>
          <p className="text-sm text-gray-500">
            Track and manage all surgical procedures
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Syringe className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {totalSurgeries}
              </p>
              <p className="text-xs text-gray-500">Total Surgeries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {scheduledCount}
              </p>
              <p className="text-xs text-gray-500">Scheduled</p>
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
                {completedCount}
              </p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                Rs. {totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surgery Table with Status Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="flex items-center gap-2 text-base text-gray-900">
              <Activity className="h-5 w-5 text-emerald-600" />
              Surgery Records
            </span>
            <Tabs
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v || "")}
            >
              <TabsList variant="line">
                <TabsTrigger value="all">
                  All ({totalSurgeries})
                </TabsTrigger>
                <TabsTrigger value="scheduled">
                  Scheduled ({scheduledCount})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({completedCount})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                  Cancelled ({surgeries.filter((s) => s.status === 'cancelled').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Syringe className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No surgeries found</p>
              <p className="text-xs">
                {statusFilter !== 'all'
                  ? 'No surgeries with this status'
                  : 'Surgeries will appear here when created'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Surgery ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="hidden sm:table-cell">Doctor</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead>Surgery</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">
                      Doc Fee
                    </TableHead>
                    <TableHead className="text-right hidden lg:table-cell">
                      Hospital
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((surgery) => (
                    <>
                      <TableRow
                        key={surgery.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleExpand(surgery.id)}
                      >
                        <TableCell className="w-8 text-gray-400">
                          {expandedId === surgery.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {surgery.surgery_id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {surgery.patient?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {surgery.patient?.patient_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {surgery.doctor?.full_name || '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {surgery.surgery_type && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-gray-50"
                            >
                              {surgery.surgery_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
                          {surgery.surgery_name}
                        </TableCell>
                        <TableCell className="text-right text-sm hidden lg:table-cell text-gray-500">
                          Rs. {surgery.doctor_fee.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm hidden lg:table-cell text-gray-500">
                          Rs. {surgery.hospital_charges.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-emerald-700">
                          Rs. {surgery.total_charges.toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {surgery.surgery_date
                            ? new Date(
                                surgery.surgery_date
                              ).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell>{getStatusBadge(surgery.status)}</TableCell>
                      </TableRow>

                      {/* Expanded Details */}
                      {expandedId === surgery.id && (
                        <TableRow key={`${surgery.id}-detail`}>
                          <TableCell colSpan={11}>
                            <div className="bg-gray-50 rounded-lg p-4 mx-2 mb-2 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Doctor
                                  </p>
                                  <p className="text-sm text-gray-900">
                                    {surgery.doctor?.full_name || 'Not assigned'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Patient Phone
                                  </p>
                                  <p className="text-sm text-gray-900">
                                    {surgery.patient?.phone || '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Surgery Date
                                  </p>
                                  <p className="text-sm text-gray-900">
                                    {surgery.surgery_date
                                      ? new Date(
                                          surgery.surgery_date
                                        ).toLocaleDateString('en-US', {
                                          weekday: 'long',
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                        })
                                      : 'Not scheduled'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Hospital Charges
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {surgery.includes_hospital_charges ? (
                                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                        <Building2 className="h-3 w-3 mr-1" />
                                        Included
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                        <FileText className="h-3 w-3 mr-1" />
                                        Separate
                                      </Badge>
                                    )}
                                    <span className="text-sm text-gray-600">
                                      Rs.{' '}
                                      {surgery.hospital_charges.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {surgery.notes && (
                                <div>
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                    Notes
                                  </p>
                                  <p className="text-sm text-gray-700 bg-white rounded-md p-2 border">
                                    {surgery.notes}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <XCircle className="h-3 w-3" />
                                Created:{' '}
                                {new Date(
                                  surgery.created_at
                                ).toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

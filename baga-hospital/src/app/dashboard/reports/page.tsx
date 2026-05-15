'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  Users,
  Stethoscope,
  FlaskConical,
  FileText,
  Syringe,
  BarChart3,
  TrendingUp,
  CalendarDays,
  CreditCard,
  UserCheck,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportData {
  totalRevenue: number;
  totalPatients: number;
  totalVisits: number;
  totalLabTests: number;
  totalPrescriptions: number;
  totalSurgeries: number;
  revenueByType: Record<string, number>;
  recentPayments: {
    id: number;
    payment_id: string;
    amount: number;
    payment_type: string | null;
    payment_method: string | null;
    created_at: string;
    patient: { id: number; patient_id: string; full_name: string } | null;
    visit: { id: number; visit_id: string } | null;
  }[];
  doctorFeeSummary: {
    name: string;
    totalFees: number;
    hospitalShare: number;
    doctorShare: number;
  }[];
  surgeryRevenue: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const router = useRouter();
  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fromDate, setFromDate] = useState(formatDate(firstOfMonth));
  const [toDate, setToDate] = useState(formatDate(today));

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  /* ---- Fetch report data ---- */
  useEffect(() => {
    let cancelled = false;
    if (!hospitalId) return;

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    const params = new URLSearchParams({
      hospital_id: String(hospitalId),
      from: fromDate,
      to: toDate,
    });

    fetch(`/api/reports?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.totalRevenue !== undefined) {
          setReport(data);
        } else {
          toast.error(data.error || 'Failed to fetch report');
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to fetch report');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hospitalId, fromDate, toDate, fetchKey]);

  const handleRefresh = () => setFetchKey((k) => k + 1);

  /* ---- Revenue by type sorted ---- */
  const revenueEntries = report
    ? Object.entries(report.revenueByType).sort((a, b) => b[1] - a[1])
    : [];
  const maxRevenue = revenueEntries.length > 0 ? revenueEntries[0][1] : 1;

  /* ---- Doctor summary sorted ---- */
  const doctorSummary = report
    ? [...report.doctorFeeSummary].sort(
        (a, b) => b.totalFees - a.totalFees
      )
    : [];

  const PAYMENT_TYPE_COLORS: Record<string, string> = {
    consultation: 'bg-emerald-500',
    medicine: 'bg-blue-500',
    lab: 'bg-purple-500',
    surgery: 'bg-red-500',
    emergency: 'bg-amber-500',
    hospital_charges: 'bg-teal-500',
    other: 'bg-gray-400',
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
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">
            Hospital analytics and financial overview
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                From Date
              </Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full sm:w-48"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                To Date
              </Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full sm:w-48"
              />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm text-gray-500">Loading report data...</p>
            </div>
          </CardContent>
        </Card>
      ) : report ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Rs. {report.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {report.totalPatients}
                  </p>
                  <p className="text-xs text-gray-500">Total Patients</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Stethoscope className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {report.totalVisits}
                  </p>
                  <p className="text-xs text-gray-500">Total Visits</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <FlaskConical className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {report.totalLabTests}
                  </p>
                  <p className="text-xs text-gray-500">Lab Tests</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                  <FileText className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {report.totalPrescriptions}
                  </p>
                  <p className="text-xs text-gray-500">Prescriptions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <Syringe className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {report.totalSurgeries}
                  </p>
                  <p className="text-xs text-gray-500">Surgeries</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Payment Type + Doctor Fee Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Payment Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Revenue by Payment Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <DollarSign className="h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-sm">No revenue data</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revenueEntries.map(([type, amount]) => {
                      const pct =
                        maxRevenue > 0 ? (amount / maxRevenue) * 100 : 0;
                      const barColor =
                        PAYMENT_TYPE_COLORS[type] || 'bg-gray-400';
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700 capitalize font-medium">
                              {type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              Rs. {amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700">
                          Total
                        </span>
                        <span className="text-sm font-bold text-emerald-700">
                          Rs. {report.totalRevenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Doctor Fee Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Doctor Fee Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {doctorSummary.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Stethoscope className="h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-sm">No doctor fee data</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Doctor</TableHead>
                          <TableHead className="text-right">
                            Total Fees
                          </TableHead>
                          <TableHead className="text-right hidden sm:table-cell">
                            Hospital
                          </TableHead>
                          <TableHead className="text-right">
                            Doctor
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctorSummary.map((doc) => (
                          <TableRow key={doc.name}>
                            <TableCell className="text-sm font-medium text-gray-900">
                              {doc.name}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              Rs. {doc.totalFees.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell text-gray-500">
                              Rs. {doc.hospitalShare.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm text-emerald-600 font-semibold">
                              Rs. {doc.doctorShare.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals */}
                        <TableRow className="bg-gray-50 font-semibold">
                          <TableCell className="text-sm text-gray-700">
                            Total ({doctorSummary.length} doctors)
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            Rs.{' '}
                            {doctorSummary
                              .reduce((s, d) => s + d.totalFees, 0)
                              .toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm hidden sm:table-cell text-gray-500">
                            Rs.{' '}
                            {doctorSummary
                              .reduce((s, d) => s + d.hospitalShare, 0)
                              .toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm text-emerald-700">
                            Rs.{' '}
                            {doctorSummary
                              .reduce((s, d) => s + d.doctorShare, 0)
                              .toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Recent Payments
                {report.recentPayments.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50"
                  >
                    {report.recentPayments.length} shown
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {report.recentPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <CreditCard className="h-10 w-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No payments found</p>
                  <p className="text-xs">No payments recorded in this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Type
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Method
                        </TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.recentPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">
                            {payment.payment_id}
                          </TableCell>
                          <TableCell className="text-sm">
                            {payment.patient?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {payment.payment_type ? (
                              <Badge
                                variant="outline"
                                className="text-xs capitalize bg-gray-50"
                              >
                                {payment.payment_type.replace(/_/g, ' ')}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-500">
                            {payment.payment_method || '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-700">
                            Rs. {payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                            {new Date(
                              payment.created_at
                            ).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="bg-gray-50 font-semibold">
                        <TableCell colSpan={4} className="text-sm text-gray-700">
                          Total ({report.recentPayments.length} payments)
                        </TableCell>
                        <TableCell className="text-right text-sm text-emerald-700">
                          Rs.{' '}
                          {report.recentPayments
                            .reduce((s, p) => s + p.amount, 0)
                            .toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell" />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

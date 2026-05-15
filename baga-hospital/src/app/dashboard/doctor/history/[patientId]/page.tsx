'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Clipboard,
  Pill,
  FlaskConical,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PatientInfo {
  id: number;
  patient_id: string;
  full_name: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  blood_group?: string;
  cnic?: string;
  emergency_contact?: string;
}

interface VisitRecord {
  id: number;
  visit_id: string;
  visit_type: string;
  consultation_fee: number;
  emergency_fee: number;
  total_fee: number;
  hospital_charges: number;
  status: string;
  visit_date: string;
  created_at: string;
  notes?: string;
  doctor: { id: number; full_name: string; specialization?: string } | null;
  prescriptions: PrescriptionRecord[];
  payments: PaymentRecord[];
  lab_orders: LabOrderRecord[];
  surgeries: SurgeryRecord[];
  discharge: DischargeRecord | null;
}

interface PrescriptionRecord {
  id: number;
  rx_id: string;
  diagnosis?: string;
  notes?: string;
  created_at: string;
  doctor: { id: number; full_name: string; specialization?: string } | null;
  medicines: MedicineRecord[];
}

interface MedicineRecord {
  id: number;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration_days: number;
  instructions?: string;
  quantity: number;
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

interface LabOrderRecord {
  id: number;
  order_id: string;
  status: string;
  total_price: number;
  ordered_at: string;
  reports: LabReportRecord[];
}

interface LabReportRecord {
  id: number;
  test_name: string;
  status: string;
  result_values: Array<{
    parameter: string;
    value: string;
    unit: string;
    range: string;
  }>;
  remarks?: string;
  completed_at?: string;
}

interface SurgeryRecord {
  id: number;
  surgery_id: string;
  surgery_type?: string;
  surgery_name: string;
  doctor_fee: number;
  hospital_charges: number;
  total_charges: number;
  status: string;
  notes?: string;
  created_at: string;
  doctor: { id: number; full_name: string } | null;
}

interface DischargeRecord {
  id: number;
  discharge_id: string;
  discharge_date: string;
  diagnosis?: string;
  summary?: string;
  follow_up_date?: string;
  total_bill: number;
  total_paid: number;
  balance: number;
  status: string;
}

interface HistoryData {
  patient: PatientInfo;
  visits: VisitRecord[];
  totalVisits: number;
  totalSpent: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const visitTypeColor: Record<string, string> = {
  opd: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
  followup: 'bg-blue-50 text-blue-700 border-blue-200',
};

const labStatusColor: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PatientHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRx, setExpandedRx] = useState<Set<number>>(new Set());

  const toggleRx = (id: number) => {
    setExpandedRx((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/history`);
        const result = await res.json();
        if (res.ok) {
          setData(result);
        } else {
          toast.error(result.error || 'Failed to load patient history');
          router.push('/dashboard');
        }
      } catch {
        toast.error('Failed to load patient history');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (patientId) fetchHistory();
  }, [patientId, router]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-10 w-96 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  /* ---- Flatten data across visits ---- */
  const allPrescriptions = data.visits.flatMap((v) => v.prescriptions);
  const allLabOrders = data.visits.flatMap((v) => v.lab_orders);
  const allPayments = data.visits.flatMap((v) => v.payments);

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
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient History</h1>
          <p className="text-sm text-gray-500">
            {data.patient.full_name} — {data.patient.patient_id}
          </p>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500">Name: </span>
              <span className="font-semibold text-gray-900">
                {data.patient.full_name}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Age: </span>
              <span className="font-medium text-gray-900">
                {data.patient.age || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Gender: </span>
              <span className="font-medium text-gray-900">
                {data.patient.gender || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Phone: </span>
              <span className="font-medium text-gray-900">
                {data.patient.phone || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Blood Group: </span>
              {data.patient.blood_group ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 ml-1">
                  {data.patient.blood_group}
                </span>
              ) : (
                <span className="font-medium text-gray-900">N/A</span>
              )}
            </div>
            <div>
              <span className="text-gray-500">CNIC: </span>
              <span className="font-medium text-gray-900">
                {data.patient.cnic || 'N/A'}
              </span>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="text-emerald-600 font-semibold">
              Total Visits: {data.totalVisits}
            </div>
            <div className="text-emerald-600 font-semibold">
              Total Spent: Rs. {data.totalSpent.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="visits">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visits">
            <Clipboard className="h-4 w-4 mr-1.5" /> Visits
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <Pill className="h-4 w-4 mr-1.5" /> Prescriptions
          </TabsTrigger>
          <TabsTrigger value="lab">
            <FlaskConical className="h-4 w-4 mr-1.5" /> Lab Reports
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-1.5" /> Payments
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/*  Tab: Visits                                                  */}
        {/* ============================================================ */}
        <TabsContent value="visits">
          <Card>
            <CardContent className="p-0">
              {data.visits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Clipboard className="h-10 w-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No visits recorded</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Visit records will appear here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visit ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Doctor
                        </TableHead>
                        <TableHead className="text-right">Fee (Rs.)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.visits.map((v) => (
                        <TableRow
                          key={v.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() =>
                            router.push(
                              `/dashboard/doctor/prescribe/${v.id}`
                            )
                          }
                        >
                          <TableCell className="font-mono text-xs">
                            {v.visit_id}
                          </TableCell>
                          <TableCell className="text-sm">
                            {v.visit_date}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                visitTypeColor[v.visit_type] ||
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }
                            >
                              {v.visit_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {v.doctor?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            Rs. {v.total_fee.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                v.status === 'discharged'
                                  ? 'bg-gray-100 text-gray-600 border-gray-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }
                            >
                              {v.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/*  Tab: Prescriptions                                           */}
        {/* ============================================================ */}
        <TabsContent value="prescriptions">
          <div className="space-y-4">
            {allPrescriptions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Pill className="h-10 w-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No prescriptions found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Prescriptions will appear here after they are created
                  </p>
                </CardContent>
              </Card>
            ) : (
              allPrescriptions.map((rx) => (
                <Card key={rx.id}>
                  <CardContent className="p-4">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between"
                      onClick={() => toggleRx(rx.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                          <Pill className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">
                            {rx.rx_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {rx.doctor?.full_name || 'Unknown'} |{' '}
                            {new Date(rx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rx.diagnosis && (
                          <Badge
                            variant="outline"
                            className="text-xs max-w-[200px] truncate hidden sm:inline-flex"
                          >
                            {rx.diagnosis}
                          </Badge>
                        )}
                        {expandedRx.has(rx.id) ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedRx.has(rx.id) && (
                      <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                        {rx.diagnosis && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                              Diagnosis
                            </p>
                            <p className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2">
                              {rx.diagnosis}
                            </p>
                          </div>
                        )}
                        {rx.notes && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                              Notes
                            </p>
                            <p className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2">
                              {rx.notes}
                            </p>
                          </div>
                        )}
                        {rx.medicines && rx.medicines.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                              Medicines
                            </p>
                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden sm:table-cell">
                                      Dosage
                                    </TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                      Duration
                                    </TableHead>
                                    <TableHead className="hidden lg:table-cell">
                                      Instructions
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Qty
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rx.medicines.map((med) => (
                                    <TableRow key={med.id}>
                                      <TableCell className="text-sm font-medium text-gray-900">
                                        {med.medicine_name}
                                      </TableCell>
                                      <TableCell className="hidden sm:table-cell text-xs">
                                        {med.dosage || '—'}
                                      </TableCell>
                                      <TableCell className="text-xs font-mono">
                                        {med.frequency || '—'}
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell text-xs">
                                        {med.duration_days} day(s)
                                      </TableCell>
                                      <TableCell className="hidden lg:table-cell text-xs">
                                        {med.instructions || '—'}
                                      </TableCell>
                                      <TableCell className="text-right text-xs">
                                        {med.quantity}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/*  Tab: Lab Reports                                             */}
        {/* ============================================================ */}
        <TabsContent value="lab">
          <div className="space-y-4">
            {allLabOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <FlaskConical className="h-10 w-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No lab reports found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Lab orders and reports will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              allLabOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                          <FlaskConical className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {order.order_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.ordered_at).toLocaleDateString()}{' '}
                            | Rs. {order.total_price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          labStatusColor[order.status] ||
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }
                      >
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {order.reports && order.reports.length > 0 && (
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        {order.reports.map((report) => (
                          <div
                            key={report.id}
                            className="rounded-lg border border-gray-200 p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {report.test_name}
                              </span>
                              <Badge
                                variant="outline"
                                className={
                                  report.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                }
                              >
                                {report.status}
                              </Badge>
                            </div>

                            {report.status === 'completed' &&
                            report.result_values &&
                            report.result_values.length > 0 ? (
                              <div className="rounded-md border border-gray-100 overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Parameter</TableHead>
                                      <TableHead>Value</TableHead>
                                      <TableHead>Unit</TableHead>
                                      <TableHead className="hidden sm:table-cell">
                                        Reference Range
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {report.result_values.map((rv, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="text-xs font-medium text-gray-700 py-1.5">
                                          {rv.parameter}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono font-semibold py-1.5">
                                          {rv.value}
                                        </TableCell>
                                        <TableCell className="text-xs py-1.5 text-gray-500">
                                          {rv.unit}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs py-1.5 text-gray-500">
                                          {rv.range}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">
                                Report pending...
                              </p>
                            )}

                            {report.remarks && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                Remarks: {report.remarks}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/*  Tab: Payments                                                */}
        {/* ============================================================ */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {allPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <CreditCard className="h-10 w-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No payment records</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Payment history will appear here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Method
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">Type</TableHead>
                        <TableHead className="text-right">
                          Amount (Rs.)
                        </TableHead>
                        <TableHead className="hidden md:table-cell">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">
                            {p.payment_id}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(p.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {p.payment_method ? (
                              <Badge variant="outline" className="text-xs">
                                {p.payment_method}
                              </Badge>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs">
                            {p.payment_type || '—'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-700">
                            Rs. {p.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-gray-500 max-w-[200px] truncate">
                            {p.notes || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Payment Summary */}
              {allPayments.length > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 bg-emerald-50/50">
                  <span className="text-sm font-semibold text-gray-700">
                    Total Payments: {allPayments.length}
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    Rs.{' '}
                    {allPayments
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

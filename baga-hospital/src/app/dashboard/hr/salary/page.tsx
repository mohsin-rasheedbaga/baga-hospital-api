'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Wallet,
  Banknote,
  CheckCircle2,
  FileText,
  CalendarDays,
  Users,
  CircleDollarSign,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  designation: string;
  department: string | null;
  basic_salary: number;
  monthly_leaves: number;
}

interface SalaryRecord {
  id: number;
  employee_id: number;
  month: string;
  year: number;
  basic_salary: number;
  leaves_taken: number;
  leave_deduction: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  notes: string | null;
  employee: {
    id: number;
    employee_id: string;
    full_name: string;
    designation: string;
    department: string | null;
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SalaryPage() {
  const router = useRouter();
  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;
  const userId = typeof window !== 'undefined' ? getUserData().id : null;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const [currentSalary, setCurrentSalary] = useState<SalaryRecord | null>(null);
  const [monthRecords, setMonthRecords] = useState<SalaryRecord[]>([]);

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [loadingMonthRecords, setLoadingMonthRecords] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState(false);

  const [fetchKey, setFetchKey] = useState(0);

  // Generate salary form
  const [formLeaves, setFormLeaves] = useState('0');
  const [formBonuses, setFormBonuses] = useState('0');
  const [formDeductions, setFormDeductions] = useState('0');
  const [formNotes, setFormNotes] = useState('');

  /* ---- Fetch employees ---- */
  useEffect(() => {
    const load = async () => {
      if (!hospitalId) return;
      setLoadingEmployees(true);
      try {
        const res = await fetch(`/api/employees?hospital_id=${hospitalId}`);
        const data = await res.json();
        if (res.ok) {
          setEmployees(data.employees || []);
        } else {
          toast.error(data.error || 'Failed to fetch employees');
        }
      } catch {
        toast.error('Failed to fetch employees');
      } finally {
        setLoadingEmployees(false);
      }
    };
    load();
  }, [hospitalId]);

  /* ---- Fetch salary for selected employee + month ---- */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!selectedEmployeeId || !selectedMonth || !selectedYear) {
        setCurrentSalary(null);
        return;
      }
      setLoadingSalary(true);
      try {
        const monthIdx = MONTHS.indexOf(selectedMonth) + 1;
        const params = new URLSearchParams({
          hospital_id: String(hospitalId),
          employee_id: selectedEmployeeId,
          month: String(monthIdx),
          year: selectedYear,
        });
        const res = await fetch(`/api/salary?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          const records: SalaryRecord[] = data.records || [];
          if (records.length > 0) {
            setCurrentSalary(records[0]);
          } else {
            setCurrentSalary(null);
          }
        }
      } catch {
        if (!cancelled) toast.error('Failed to fetch salary');
      } finally {
        if (!cancelled) setLoadingSalary(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [selectedEmployeeId, selectedMonth, selectedYear, hospitalId, fetchKey]);

  /* ---- Fetch all month records for table ---- */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!hospitalId || !selectedMonth || !selectedYear) {
        setMonthRecords([]);
        return;
      }
      setLoadingMonthRecords(true);
      try {
        const monthIdx = MONTHS.indexOf(selectedMonth) + 1;
        const params = new URLSearchParams({
          hospital_id: String(hospitalId),
          month: String(monthIdx),
          year: selectedYear,
        });
        const res = await fetch(`/api/salary?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setMonthRecords(data.records || []);
        }
      } catch {
        if (!cancelled) toast.error('Failed to fetch salary records');
      } finally {
        if (!cancelled) setLoadingMonthRecords(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [hospitalId, selectedMonth, selectedYear, fetchKey]);

  /* ---- Generate salary ---- */
  const handleGenerate = async () => {
    if (!selectedEmployeeId) return;

    setGenerating(true);
    try {
      const monthIdx = MONTHS.indexOf(selectedMonth) + 1;
      const res = await fetch('/api/salary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          employee_id: selectedEmployeeId,
          month: monthIdx,
          year: parseInt(selectedYear, 10),
          leaves_taken: parseInt(formLeaves) || 0,
          bonuses: parseFloat(formBonuses) || 0,
          deductions: parseFloat(formDeductions) || 0,
          notes: formNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Salary generated successfully');
        setFormLeaves('0');
        setFormBonuses('0');
        setFormDeductions('0');
        setFormNotes('');
        setFetchKey((k) => k + 1);
      } else {
        toast.error(data.error || 'Failed to generate salary');
      }
    } catch {
      toast.error('Failed to generate salary');
    } finally {
      setGenerating(false);
    }
  };

  /* ---- Mark as Paid ---- */
  const handlePay = async () => {
    if (!currentSalary || !userId) return;

    setPaying(true);
    try {
      const res = await fetch(`/api/salary/${currentSalary.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_by: userId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Salary marked as paid');
        setFetchKey((k) => k + 1);
      } else {
        toast.error(data.error || 'Failed to mark as paid');
      }
    } catch {
      toast.error('Failed to mark as paid');
    } finally {
      setPaying(false);
    }
  };

  const selectedEmployee = employees.find(
    (e) => String(e.id) === selectedEmployeeId
  );

  /* ---- Compute month summary ---- */
  const monthTotalNet = monthRecords.reduce((sum, r) => sum + r.net_salary, 0);
  const monthTotalPaid = monthRecords
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.net_salary, 0);
  const monthTotalPending = monthRecords
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.net_salary, 0);

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
            Salary Management
          </h1>
          <p className="text-sm text-gray-500">
            Generate and manage employee salaries
          </p>
        </div>
      </div>

      {/* Selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Employee Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Employee
              </Label>
              {loadingEmployees ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 h-9">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : (
                <Select
                  value={selectedEmployeeId}
                  onValueChange={(v) => setSelectedEmployeeId(v || "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.full_name} — {e.designation}
                      </SelectItem>
                    ))}
                    {employees.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No employees available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Month Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Month</Label>
              <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Year</Label>
              <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Employee Salary Section */}
      {selectedEmployeeId && (
        <>
          {loadingSalary ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </CardContent>
            </Card>
          ) : currentSalary ? (
            /* ---- Existing salary record ---- */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base text-gray-900">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    {selectedEmployee?.full_name || 'Employee'} —{' '}
                    {selectedMonth} {selectedYear}
                  </span>
                  <Badge
                    className={
                      currentSalary.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                        : 'bg-amber-50 text-amber-700 border-amber-200 text-xs'
                    }
                  >
                    {currentSalary.status === 'paid' ? 'Paid' : 'Pending'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Basic Salary</p>
                    <p className="text-lg font-bold text-gray-900">
                      Rs. {currentSalary.basic_salary.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Leaves Taken</p>
                    <p className="text-lg font-bold text-gray-900">
                      {currentSalary.leaves_taken}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xs text-gray-500">Leave Deduction</p>
                    <p className="text-lg font-bold text-red-600">
                      Rs. {currentSalary.leave_deduction.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs text-gray-500">Bonuses</p>
                    <p className="text-lg font-bold text-emerald-600">
                      Rs. {currentSalary.bonuses.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xs text-gray-500">Deductions</p>
                    <p className="text-lg font-bold text-red-600">
                      Rs. {currentSalary.deductions.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                    <p className="text-xs text-gray-500">Net Salary</p>
                    <p className="text-lg font-bold text-emerald-700">
                      Rs. {currentSalary.net_salary.toLocaleString()}
                    </p>
                  </div>
                </div>

                {currentSalary.status === 'pending' && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handlePay}
                      disabled={paying}
                    >
                      {paying ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Paid
                    </Button>
                  </div>
                )}

                {currentSalary.paid_at && (
                  <p className="mt-3 text-xs text-gray-400">
                    Paid on {new Date(currentSalary.paid_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            /* ---- No salary record — generate form ---- */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Generate Salary — {selectedEmployee?.full_name || 'Employee'}{' '}
                  — {selectedMonth} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEmployee && (
                  <div className="rounded-lg bg-gray-50 p-3 mb-4">
                    <p className="text-sm text-gray-600">
                      Basic Salary:{' '}
                      <span className="font-bold">
                        Rs. {selectedEmployee.basic_salary.toLocaleString()}
                      </span>
                      {' | '}Allowed Leaves:{' '}
                      <span className="font-bold">
                        {selectedEmployee.monthly_leaves}
                      </span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="sal_leaves">Leaves Taken</Label>
                    <Input
                      id="sal_leaves"
                      type="number"
                      min="0"
                      value={formLeaves}
                      onChange={(e) => setFormLeaves(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sal_bonuses">Bonuses (Rs.)</Label>
                    <Input
                      id="sal_bonuses"
                      type="number"
                      min="0"
                      value={formBonuses}
                      onChange={(e) => setFormBonuses(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sal_deductions">Deductions (Rs.)</Label>
                    <Input
                      id="sal_deductions"
                      type="number"
                      min="0"
                      value={formDeductions}
                      onChange={(e) => setFormDeductions(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Label htmlFor="sal_notes">Notes (optional)</Label>
                  <Textarea
                    id="sal_notes"
                    placeholder="Any additional notes..."
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Wallet className="h-4 w-4 mr-2" />
                    )}
                    Generate Salary
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Month Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                Rs. {monthTotalNet.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                Total Net ({selectedMonth} {selectedYear})
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                Rs. {monthTotalPaid.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-200">
              <Banknote className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                Rs. {monthTotalPending.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All salary records for selected month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            All Salary Records — {selectedMonth} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMonthRecords ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : monthRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No salary records found</p>
              <p className="text-xs">
                Select an employee and generate salary above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Designation
                    </TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Leaves
                    </TableHead>
                    <TableHead className="text-right hidden md:table-cell">
                      Bonuses
                    </TableHead>
                    <TableHead className="text-right hidden lg:table-cell">
                      Deductions
                    </TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">
                          {record.employee?.full_name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {record.employee?.designation || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        Rs. {record.basic_salary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell text-gray-500">
                        {record.leaves_taken}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell text-emerald-600">
                        + Rs. {record.bonuses.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden lg:table-cell text-red-600">
                        - Rs.{' '}
                        {(record.leave_deduction + record.deductions).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-emerald-700">
                        Rs. {record.net_salary.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                              : 'bg-amber-50 text-amber-700 border-amber-200 text-xs'
                          }
                        >
                          {record.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2} className="text-sm text-gray-700">
                      Total ({monthRecords.length} records)
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      Rs.{' '}
                      {monthRecords
                        .reduce((s, r) => s + r.basic_salary, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell text-gray-500">
                      {monthRecords.reduce((s, r) => s + r.leaves_taken, 0)}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell text-emerald-600">
                      + Rs.{' '}
                      {monthRecords
                        .reduce((s, r) => s + r.bonuses, 0)
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden lg:table-cell text-red-600">
                      - Rs.{' '}
                      {monthRecords
                        .reduce(
                          (s, r) => s + r.leave_deduction + r.deductions,
                          0
                        )
                        .toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-emerald-700">
                      Rs. {monthTotalNet.toLocaleString()}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Users,
  Loader2,
  Plus,
  UserPlus,
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
  phone: string | null;
  email: string | null;
  cnic: string | null;
  basic_salary: number;
  monthly_leaves: number;
  joining_date: string;
  is_active: boolean;
  created_at: string;
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

export default function EmployeesPage() {
  const router = useRouter();
  const hospitalId =
    typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Form fields
  const [formFullName, setFormFullName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCnic, setFormCnic] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formBasicSalary, setFormBasicSalary] = useState('');
  const [formMonthlyLeaves, setFormMonthlyLeaves] = useState('2');

  /* ---- Fetch employees ---- */
  useEffect(() => {
    let cancelled = false;
    if (!hospitalId) return;

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/employees?hospital_id=${hospitalId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.employees) setEmployees(data.employees);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to fetch employees');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hospitalId, fetchKey]);

  /* ---- Filter ---- */
  const filtered = employees.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.phone || '').includes(q)
    );
  });

  /* ---- Add Employee ---- */
  const handleSubmit = async () => {
    if (!formFullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!formDesignation.trim()) {
      toast.error('Designation is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          full_name: formFullName.trim(),
          designation: formDesignation.trim(),
          department: formDepartment.trim() || null,
          phone: formPhone.trim() || null,
          email: formEmail.trim() || null,
          cnic: formCnic.trim() || null,
          joining_date: formJoiningDate || null,
          basic_salary: parseFloat(formBasicSalary) || 0,
          monthly_leaves: parseInt(formMonthlyLeaves) || 2,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Employee ${data.employee.full_name} added successfully`);
        setDialogOpen(false);
        resetForm();
        setFetchKey((k) => k + 1);
      } else {
        toast.error(data.error || 'Failed to add employee');
      }
    } catch {
      toast.error('Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormFullName('');
    setFormDesignation('');
    setFormDepartment('');
    setFormPhone('');
    setFormEmail('');
    setFormCnic('');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormBasicSalary('');
    setFormMonthlyLeaves('2');
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500">
              {employees.length} total employees
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No employees found</p>
              <p className="text-xs">
                {search ? 'Try adjusting your search' : 'Add your first employee'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Designation
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Department
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Joining
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">
                        {emp.employee_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <UserPlus className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {emp.full_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {emp.designation}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {emp.department && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-50"
                          >
                            {emp.department}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                        {emp.phone || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        Rs. {emp.basic_salary.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {emp.joining_date
                          ? new Date(emp.joining_date).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            emp.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                              : 'bg-red-50 text-red-700 border-red-200 text-xs'
                          }
                        >
                          {emp.is_active ? 'Active' : 'Inactive'}
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

      {/* Add Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Add New Employee
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emp_full_name">Full Name *</Label>
              <Input
                id="emp_full_name"
                placeholder="e.g. Muhammad Ali"
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_designation">Designation *</Label>
              <Input
                id="emp_designation"
                placeholder="e.g. Nurse, Technician"
                value={formDesignation}
                onChange={(e) => setFormDesignation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_department">Department</Label>
              <Input
                id="emp_department"
                placeholder="e.g. Emergency, OPD"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_phone">Phone</Label>
              <Input
                id="emp_phone"
                placeholder="03XX-XXXXXXX"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_email">Email</Label>
              <Input
                id="emp_email"
                type="email"
                placeholder="email@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_cnic">CNIC</Label>
              <Input
                id="emp_cnic"
                placeholder="XXXXX-XXXXXXX-X"
                value={formCnic}
                onChange={(e) => setFormCnic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_joining_date">Joining Date</Label>
              <Input
                id="emp_joining_date"
                type="date"
                value={formJoiningDate}
                onChange={(e) => setFormJoiningDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_basic_salary">Basic Salary (Rs.)</Label>
              <Input
                id="emp_basic_salary"
                type="number"
                placeholder="0"
                value={formBasicSalary}
                onChange={(e) => setFormBasicSalary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp_monthly_leaves">
                Monthly Allowed Leaves
              </Label>
              <Input
                id="emp_monthly_leaves"
                type="number"
                placeholder="2"
                value={formMonthlyLeaves}
                onChange={(e) => setFormMonthlyLeaves(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

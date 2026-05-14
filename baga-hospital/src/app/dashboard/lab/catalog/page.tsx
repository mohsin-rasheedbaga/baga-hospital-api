'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Plus,
  Loader2,
  Beaker,
  Trash2,
  Edit3,
  Save,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LabTest {
  id: number;
  test_name: string;
  test_code: string | null;
  category: string | null;
  price: number;
  report_days: number;
  is_active: boolean;
  created_at: string;
}

type DialogMode = 'add' | 'edit' | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_OPTIONS = [
  'Blood',
  'Urine',
  'X-Ray',
  'Ultrasound',
  'CT Scan',
  'MRI',
  'Other',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

const categoryColor: Record<string, string> = {
  Blood: 'bg-red-50 text-red-700 border-red-200',
  Urine: 'bg-amber-50 text-amber-700 border-amber-200',
  'X-Ray': 'bg-blue-50 text-blue-700 border-blue-200',
  Ultrasound: 'bg-purple-50 text-purple-700 border-purple-200',
  'CT Scan': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  MRI: 'bg-teal-50 text-teal-700 border-teal-200',
  Other: 'bg-gray-50 text-gray-700 border-gray-200',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabCatalogPage() {
  const router = useRouter();
  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dialog
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editId, setEditId] = useState<number | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('Blood');
  const [formPrice, setFormPrice] = useState('0');
  const [formReportDays, setFormReportDays] = useState('1');

  const [saving, setSaving] = useState(false);

  /* ---- Fetch catalog ---- */
  const fetchCatalog = useCallback(() => {
    if (!hospitalId) return;
    Promise.resolve().then(() => setLoading(true));
    fetch(`/api/lab/catalog?hospital_id=${hospitalId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tests) setTests(data.tests);
      })
      .catch(() => {
        toast.error('Failed to load lab catalog');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hospitalId]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  /* ---- Handlers ---- */
  const openAdd = () => {
    setDialogMode('add');
    setEditId(null);
    setFormName('');
    setFormCode('');
    setFormCategory('Blood');
    setFormPrice('0');
    setFormReportDays('1');
  };

  const openEdit = (test: LabTest) => {
    setDialogMode('edit');
    setEditId(test.id);
    setFormName(test.test_name);
    setFormCode(test.test_code || '');
    setFormCategory(test.category || 'Other');
    setFormPrice(String(test.price));
    setFormReportDays(String(test.report_days));
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Test name is required');
      return;
    }
    if (!hospitalId) {
      toast.error('Hospital ID not found');
      return;
    }

    setSaving(true);

    try {
      if (dialogMode === 'add') {
        const res = await fetch('/api/lab/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hospital_id: hospitalId,
            test_name: formName.trim(),
            test_code: formCode.trim() || null,
            category: formCategory,
            price: parseFloat(formPrice) || 0,
            report_days: parseInt(formReportDays, 10) || 1,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`"${formName.trim()}" added to catalog`);
          fetchCatalog();
          closeDialog();
        } else {
          toast.error(data.error || 'Failed to add test');
        }
      } else if (dialogMode === 'edit' && editId) {
        // For edit, we optimistically update local state
        // since there's no dedicated PUT endpoint for catalog items
        setTests((prev) =>
          prev.map((t) =>
            t.id === editId
              ? {
                  ...t,
                  test_name: formName.trim(),
                  test_code: formCode.trim() || null,
                  category: formCategory,
                  price: parseFloat(formPrice) || 0,
                  report_days: parseInt(formReportDays, 10) || 1,
                }
              : t
          )
        );
        toast.success(`"${formName.trim()}" updated`);
        closeDialog();
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (test: LabTest) => {
    // Optimistic delete (no DELETE endpoint specified)
    setTests((prev) => prev.filter((t) => t.id !== test.id));
    toast.success(`"${test.test_name}" removed from catalog`);
  };

  /* ---- Filter ---- */
  const filtered = tests.filter((test) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !test.test_name.toLowerCase().includes(q) &&
        !(test.test_code || '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filterCategory !== 'all' && test.category !== filterCategory) return false;
    return true;
  });

  const categoryCounts = tests.reduce<Record<string, number>>((acc, t) => {
    const cat = t.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

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
            <h1 className="text-2xl font-bold text-gray-900">Lab Test Catalog</h1>
            <p className="text-sm text-gray-500">
              {tests.length} tests available
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={fetchCatalog}
            className="text-gray-500"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Test
          </Button>
        </div>
      </div>

      {/* Category pills + search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by test name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v || "")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c} {categoryCounts[c] ? `(${categoryCounts[c]})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
                <FlaskConical className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-base font-medium text-gray-700 mb-1">No tests in catalog</p>
              <p className="text-sm text-gray-400 mb-4">
                Add lab tests to make them available for ordering
              </p>
              <Button
                variant="outline"
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={openAdd}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Test
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Beaker className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No results match your filters</p>
              <p className="text-xs text-gray-400">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Report Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Beaker className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          {test.test_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {test.test_code || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${categoryColor[test.category || 'Other'] || ''}`}
                        >
                          {test.category || 'Other'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-gray-700">
                        Rs. {(test.price || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600 hidden sm:table-cell">
                        {test.report_days || 1} day{(test.report_days || 1) > 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                            onClick={() => openEdit(test)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(test)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-emerald-600" />
              {dialogMode === 'add' ? 'Add Lab Test' : 'Edit Lab Test'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Add a new test to the lab catalog'
                : 'Update test details in the catalog'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test-name" className="text-sm font-medium">
                Test Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="test-name"
                placeholder="e.g., Complete Blood Count"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="test-code" className="text-sm font-medium">
                  Test Code
                </Label>
                <Input
                  id="test-code"
                  placeholder="e.g., CBC-001"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="test-price" className="text-sm font-medium">
                  Price (Rs.)
                </Label>
                <Input
                  id="test-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-days" className="text-sm font-medium">
                  Report Days
                </Label>
                <Input
                  id="test-days"
                  type="number"
                  min="0"
                  placeholder="1"
                  value={formReportDays}
                  onChange={(e) => setFormReportDays(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              {dialogMode === 'add' ? 'Add Test' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

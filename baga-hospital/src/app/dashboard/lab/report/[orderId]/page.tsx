'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  FlaskConical,
  Save,
  CheckCircle2,
  FileText,
  User,
  Stethoscope,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LabOrder {
  id: number;
  order_id: string;
  status: string;
  test_ids: number[];
  total_price: number;
  ordered_at: string;
  patient?: { id: number; patient_id: string; full_name: string; phone?: string; age?: number; gender?: string } | null;
  doctor?: { id: number; full_name: string; specialization?: string } | null;
}

interface LabTestCatalogItem {
  id: number;
  test_name: string;
  test_code?: string;
  category?: string;
  price: number;
  report_days: number;
}

interface ParameterRow {
  id: string;
  parameter: string;
  value: string;
  unit: string;
  range: string;
}

interface TestReport {
  test_id: number;
  test_name: string;
  parameters: ParameterRow[];
  remarks: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

let paramIdCounter = 0;
function nextParamId() {
  return `p-${++paramIdCounter}`;
}

function emptyParameter(): ParameterRow {
  return {
    id: nextParamId(),
    parameter: '',
    value: '',
    unit: '',
    range: '',
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabReportPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [order, setOrder] = useState<LabOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [testReports, setTestReports] = useState<TestReport[]>([]);
  const [catalog, setCatalog] = useState<LabTestCatalogItem[]>([]);

  /* ---- Fetch order + catalog ---- */
  useEffect(() => {
    let cancelled = false;
    if (!hospitalId || !orderId) return;

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    Promise.all([
      fetch(`/api/lab-orders?hospital_id=${hospitalId}`).then((r) => r.json()),
      fetch(`/api/lab/catalog?hospital_id=${hospitalId}`).then((r) => r.json()),
    ])
      .then(([orderData, catalogData]) => {
        if (cancelled) return;
        if (orderData.orders) {
          const found = orderData.orders.find(
            (o: LabOrder) => String(o.id) === orderId
          );
          if (found) {
            setOrder(found);
            const tests = catalogData.tests || [];
            setCatalog(tests);
            const reports: TestReport[] = (found.test_ids || []).map((tid: number) => {
              const catItem = tests.find((t: LabTestCatalogItem) => t.id === tid);
              return {
                test_id: tid,
                test_name: catItem?.test_name || `Test #${tid}`,
                parameters: [emptyParameter()],
                remarks: '',
              };
            });
            setTestReports(reports);
          } else {
            toast.error('Lab order not found');
            router.push('/dashboard/lab/orders');
          }
        } else {
          toast.error('Failed to load lab order');
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hospitalId, orderId, router]);

  /* ---- Parameter handlers ---- */
  const addParameter = (testIdx: number) => {
    setTestReports((prev) =>
      prev.map((tr, i) =>
        i === testIdx
          ? { ...tr, parameters: [...tr.parameters, emptyParameter()] }
          : tr
      )
    );
  };

  const removeParameter = (testIdx: number, paramId: string) => {
    setTestReports((prev) =>
      prev.map((tr, i) =>
        i === testIdx
          ? { ...tr, parameters: tr.parameters.filter((p) => p.id !== paramId) }
          : tr
      )
    );
  };

  const updateParameter = (
    testIdx: number,
    paramId: string,
    field: keyof ParameterRow,
    val: string
  ) => {
    setTestReports((prev) =>
      prev.map((tr, i) =>
        i === testIdx
          ? {
              ...tr,
              parameters: tr.parameters.map((p) =>
                p.id === paramId ? { ...p, [field]: val } : p
              ),
            }
          : tr
      )
    );
  };

  const updateRemarks = (testIdx: number, remarks: string) => {
    setTestReports((prev) =>
      prev.map((tr, i) => (i === testIdx ? { ...tr, remarks } : tr))
    );
  };

  /* ---- Save ---- */
  const handleComplete = async () => {
    if (!order) return;

    for (let i = 0; i < testReports.length; i++) {
      const tr = testReports[i];
      const hasValue = tr.parameters.some((p) => p.value.trim());
      const hasParamName = tr.parameters.some((p) => p.parameter.trim());
      if (!hasValue || !hasParamName) {
        toast.error(
          `Please add at least one parameter with name and value for "${tr.test_name}"`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const reports = testReports.map((tr) => ({
        test_id: tr.test_id,
        test_name: tr.test_name,
        result_values: tr.parameters
          .filter((p) => p.parameter.trim() || p.value.trim())
          .map((p) => ({
            parameter: p.parameter.trim(),
            value: p.value.trim(),
            unit: p.unit.trim(),
            range: p.range.trim(),
          })),
        remarks: tr.remarks.trim() || undefined,
      }));

      const res = await fetch(`/api/lab-orders/${orderId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Lab report completed — ${order.order_id}`);
        setSuccess(true);
      } else {
        toast.error(data.error || 'Failed to complete report');
      }
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
          <div className="h-7 w-7 rounded-md bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-40 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-60 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-24 w-full rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-24 w-full rounded-lg bg-gray-200 animate-pulse" />
        </div>
        <div className="h-64 w-full rounded-lg bg-gray-200 animate-pulse" />
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
            Lab Report Completed!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {order?.order_id} — {order?.patient?.full_name}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard/lab/orders')}>
              Back to Lab Orders
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => router.push(`/dashboard/lab/stickers/${orderId}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Print Stickers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => router.push('/dashboard/lab/orders')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Report Entry</h1>
          <p className="text-sm text-gray-500">
            {order.order_id} — {new Date(order.ordered_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Patient Info */}
      <Card className="border-emerald-200">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <User className="h-4 w-4" />
                Patient
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {order.patient?.full_name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  {order.patient?.patient_id || 'N/A'}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Stethoscope className="h-4 w-4" />
                Referring Doctor
              </div>
              <p className="text-lg font-semibold text-gray-900">
                Dr. {order.doctor?.full_name || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {testReports.length} test(s) ordered
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Reports */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <FlaskConical className="h-5 w-5 text-emerald-600" />
          Test Reports
        </div>

        {testReports.map((testReport, testIdx) => (
          <Card key={testReport.test_id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base text-gray-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    {testIdx + 1}
                  </span>
                  {testReport.test_name}
                </span>
                {catalog.find((c) => c.id === testReport.test_id) && (
                  <span className="text-xs font-mono text-gray-400">
                    {catalog.find((c) => c.id === testReport.test_id)?.test_code}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Parameter rows */}
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  <span className="col-span-3">Parameter</span>
                  <span className="col-span-3">Value</span>
                  <span className="col-span-2">Unit</span>
                  <span className="col-span-3">Ref. Range</span>
                  <span className="col-span-1" />
                </div>

                {testReport.parameters.map((param) => (
                  <div key={param.id} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-400 sm:hidden">Param</Label>
                      <Input
                        placeholder="e.g., Hemoglobin"
                        value={param.parameter}
                        onChange={(e) =>
                          updateParameter(testIdx, param.id, 'parameter', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-400 sm:hidden">Value</Label>
                      <Input
                        placeholder="e.g., 12.5"
                        value={param.value}
                        onChange={(e) =>
                          updateParameter(testIdx, param.id, 'value', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="hidden sm:block col-span-2">
                      <Input
                        placeholder="g/dL"
                        value={param.unit}
                        onChange={(e) =>
                          updateParameter(testIdx, param.id, 'unit', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="hidden sm:block col-span-3">
                      <Input
                        placeholder="e.g., 12-16"
                        value={param.range}
                        onChange={(e) =>
                          updateParameter(testIdx, param.id, 'range', e.target.value)
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="hidden sm:flex col-span-1 justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-7 w-7"
                        onClick={() => removeParameter(testIdx, param.id)}
                        disabled={testReport.parameters.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add parameter button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-dashed border-gray-300 text-gray-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={() => addParameter(testIdx)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Parameter
              </Button>

              {/* Remarks */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-medium text-gray-500">Remarks</Label>
                <Textarea
                  placeholder="Any additional remarks..."
                  rows={2}
                  value={testReport.remarks}
                  onChange={(e) => updateRemarks(testIdx, e.target.value)}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2 pb-8">
        <Button
          onClick={handleComplete}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Save className="h-4 w-4 mr-2" />
          Complete Report
        </Button>
        <Button variant="outline" onClick={() => router.push('/dashboard/lab/orders')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

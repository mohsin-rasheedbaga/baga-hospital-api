'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ArrowLeft,
  Search,
  Pill,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PrescriptionMedicine {
  id: number;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  duration_days: number;
  instructions: string | null;
  quantity: number;
}

interface Prescription {
  id: number;
  rx_id: string;
  diagnosis: string | null;
  notes: string | null;
  created_at: string;
  is_printed: boolean;
  dispensed: boolean;
  patient?: { id: number; patient_id: string; full_name: string; phone?: string } | null;
  doctor?: { id: number; full_name: string; specialization?: string } | null;
  medicines: PrescriptionMedicine[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

function buildSchedule(med: PrescriptionMedicine): string {
  const parts: string[] = [];
  if (med.frequency) parts.push(med.frequency);
  if (med.duration_days) parts.push(`for ${med.duration_days} day${med.duration_days > 1 ? 's' : ''}`);
  if (med.instructions) parts.push(`- ${med.instructions}`);
  return parts.join(' ') || '—';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PharmacyPrescriptionsPage() {
  const router = useRouter();
  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /* ---- Fetch prescriptions ---- */
  useEffect(() => {
    let cancelled = false;
    if (!hospitalId) return;

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/prescriptions?hospital_id=${hospitalId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.prescriptions) {
          setPrescriptions(data.prescriptions);
        } else if (Array.isArray(data)) {
          setPrescriptions(data);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load prescriptions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hospitalId]);

  /* ---- Filter ---- */
  const filtered = prescriptions.filter((rx) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      rx.rx_id?.toLowerCase().includes(q) ||
      rx.patient?.full_name?.toLowerCase().includes(q) ||
      rx.doctor?.full_name?.toLowerCase().includes(q) ||
      rx.diagnosis?.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
            <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-sm text-gray-500">
              {today} &middot; {filtered.length} prescription{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by Rx ID, patient, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
          <span className="text-sm text-gray-500">Loading prescriptions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
              <FileText className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-1">No prescriptions found</p>
            <p className="text-sm text-gray-400">
              {search ? 'Try adjusting your search query' : 'No prescriptions for today yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((rx) => {
            const isExpanded = expandedId === rx.id;
            return (
              <Card
                key={rx.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isExpanded ? 'ring-2 ring-emerald-500 shadow-md' : ''
                }`}
                onClick={() => toggleExpand(rx.id)}
              >
                <CardContent className="p-5">
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {rx.rx_id}
                        </span>
                        <Badge
                          className={
                            rx.dispensed
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }
                        >
                          {rx.dispensed ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Dispensed</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-x-4 gap-y-1 text-sm flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {rx.patient?.full_name || 'Unknown Patient'}
                        </span>
                        <span className="text-gray-400">&middot;</span>
                        <span className="text-gray-600">
                          Dr. {rx.doctor?.full_name || 'N/A'}
                        </span>
                        <span className="text-gray-400">&middot;</span>
                        <span className="text-gray-500">
                          {new Date(rx.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {rx.diagnosis && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium text-gray-600">Diagnosis:</span>{' '}
                          {rx.diagnosis}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Medicines</p>
                        <p className="text-lg font-bold text-emerald-600">
                          {rx.medicines?.length || 0}
                        </p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-transform duration-200">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Medicine table */}
                  {isExpanded && rx.medicines && rx.medicines.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Pill className="h-4 w-4 text-emerald-600" />
                        Medicine Details
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/80">
                              <TableHead className="text-xs">Medicine</TableHead>
                              <TableHead className="text-xs">Dosage</TableHead>
                              <TableHead className="text-xs">Schedule</TableHead>
                              <TableHead className="text-xs hidden md:table-cell">Qty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rx.medicines.map((med, idx) => (
                              <TableRow key={med.id || idx}>
                                <TableCell className="font-medium text-sm text-gray-900">
                                  {med.medicine_name}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {med.dosage || '—'}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                                    {buildSchedule(med)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600 hidden md:table-cell">
                                  {med.quantity}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {isExpanded && (!rx.medicines || rx.medicines.length === 0) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-400 text-center py-3">
                        No medicines listed in this prescription
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, CreditCard, Search, Loader2, Banknote, CheckCircle2 } from 'lucide-react';

interface Patient {
  id: number;
  patient_id: string;
  full_name: string;
  phone?: string;
}

interface VisitPayment {
  visit_id: string;
  visit_db_id: number;
  visit_type: string;
  doctor_name?: string;
  total_fee: number;
  paid: number;
  balance: number;
}

function getUserData() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem('baga_user') || '{}');
}

export default function PaymentsPage() {
  const router = useRouter();
  const hospitalId = typeof window !== 'undefined' ? getUserData().hospital_id : null;
  const userId = typeof window !== 'undefined' ? getUserData().id : null;

  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [visitPayments, setVisitPayments] = useState<VisitPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Search patients
  const searchPatients = useCallback(async (query: string) => {
    if (!hospitalId || !query.trim()) {
      setPatients([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const res = await fetch(`/api/patients?hospital_id=${hospitalId}&search=${encodeURIComponent(query.trim())}&limit=10`);
      const data = await res.json();
      if (res.ok) setPatients(data.patients || []);
    } catch {
      // silent
    } finally {
      setSearchingPatients(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(timer);
  }, [patientSearch, searchPatients]);

  // Fetch visit payments for selected patient
  useEffect(() => {
    let cancelled = false;
    if (!selectedPatient || !hospitalId) return;

    // Schedule loading state asynchronously to satisfy react-hooks/set-state-in-effect
    Promise.resolve().then(() => {
      if (!cancelled) setLoadingPayments(true);
    });

    fetch(`/api/visits?hospital_id=${hospitalId}&status=active`)
      .then((res) => res.json())
      .then(async (data) => {
        if (cancelled) return;
        const patientVisits = (data.visits || []).filter(
          (v: { patient: { id: number } | null }) => v.patient?.id === selectedPatient.id
        );

        const enriched = await Promise.all(
          patientVisits.map(async (v: { id: number; visit_id: string; visit_type: string; doctor: { full_name: string } | null; total_fee: number }) => {
            try {
              const payRes = await fetch(`/api/payments/visit/${v.id}`);
              const payData = await payRes.json();
              return {
                visit_id: v.visit_id,
                visit_db_id: v.id,
                visit_type: v.visit_type,
                doctor_name: v.doctor?.full_name || 'N/A',
                total_fee: payData.totalBill || v.total_fee,
                paid: payData.totalPaid || 0,
                balance: payData.balance || v.total_fee,
              };
            } catch {
              return {
                visit_id: v.visit_id,
                visit_db_id: v.id,
                visit_type: v.visit_type,
                doctor_name: v.doctor?.full_name || 'N/A',
                total_fee: v.total_fee,
                paid: 0,
                balance: v.total_fee,
              };
            }
          })
        );

        if (!cancelled) setVisitPayments(enriched.filter((vp) => vp.balance > 0));
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to fetch visit details');
      })
      .finally(() => {
        if (!cancelled) setLoadingPayments(false);
      });

    return () => { cancelled = true; };
  }, [selectedPatient, hospitalId, refreshKey]);

  // Open payment dialog
  const openPaymentDialog = (visit: VisitPayment) => {
    setSelectedVisit(visit);
    setPaymentAmount(String(visit.balance));
    setPaymentMethod('Cash');
    setPaymentNotes('');
    setDialogOpen(true);
  };

  // Submit payment
  const submitPayment = async () => {
    if (!selectedVisit || !selectedPatient) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > selectedVisit.balance) {
      toast.error(`Amount cannot exceed outstanding balance of Rs. ${selectedVisit.balance}`);
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: hospitalId,
          patient_id: selectedPatient.id,
          visit_id: selectedVisit.visit_db_id,
          amount,
          payment_method: paymentMethod,
          received_by: userId,
          notes: paymentNotes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Payment failed');
        return;
      }

      toast.success(`Payment of Rs. ${amount.toLocaleString()} recorded`);
      setDialogOpen(false);
      setRefreshKey((k) => k + 1); // Trigger re-fetch
    } catch {
      toast.error('Payment failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const totalBalance = visitPayments.reduce((sum, vp) => sum + vp.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon-sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Collection</h1>
          <p className="text-sm text-gray-500">Collect payments from patients</p>
        </div>
      </div>

      {/* Patient Search */}
      <Card>
        <CardContent className="p-4">
          {selectedPatient ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <span className="text-sm font-bold text-emerald-700">
                    {selectedPatient.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedPatient.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedPatient.patient_id} | {selectedPatient.phone || 'No phone'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}>
                Change Patient
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patient by name, ID, or phone..."
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  onFocus={() => setShowPatientDropdown(true)}
                  className="pl-10"
                />
                {searchingPatients && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
              </div>
              {showPatientDropdown && patients.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                      onClick={() => { setSelectedPatient(p); setShowPatientDropdown(false); }}
                    >
                      <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                      <p className="text-xs text-gray-500">{p.patient_id} | {p.phone || 'No phone'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Payments Table */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Outstanding Visits
              </span>
              {totalBalance > 0 && (
                <Badge className="bg-red-50 text-red-700 border-red-200">
                  Total Due: Rs. {totalBalance.toLocaleString()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingPayments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : visitPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-300" />
                <p className="text-sm font-medium">No outstanding balance</p>
                <p className="text-xs">All visits are fully paid</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visit ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Doctor</TableHead>
                      <TableHead className="text-right">Total Fee</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitPayments.map((vp) => (
                      <TableRow key={vp.visit_db_id}>
                        <TableCell className="font-mono text-xs">{vp.visit_id}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              vp.visit_type === 'emergency'
                                ? 'bg-red-50 text-red-700 border-red-200 text-xs'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                            }
                          >
                            {vp.visit_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{vp.doctor_name}</TableCell>
                        <TableCell className="text-right text-sm">Rs. {vp.total_fee.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm hidden sm:table-cell text-emerald-600">Rs. {vp.paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-red-600">Rs. {vp.balance.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openPaymentDialog(vp)}
                          >
                            <Banknote className="h-3.5 w-3.5 mr-1" />
                            Collect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Collect Payment
            </DialogTitle>
          </DialogHeader>

          {selectedVisit && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                <p className="text-xs text-gray-500">Visit: {selectedVisit.visit_id}</p>
                <p className="text-sm font-medium">
                  Outstanding Balance:{' '}
                  <span className="text-red-600 font-bold">Rs. {selectedVisit.balance.toLocaleString()}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_amount">Amount (Rs.)</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  min="1"
                  max={selectedVisit.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v || "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">💵 Cash</SelectItem>
                    <SelectItem value="Card">💳 Card</SelectItem>
                    <SelectItem value="Online">📱 Online Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_notes">Notes (optional)</Label>
                <Textarea
                  id="payment_notes"
                  placeholder="Payment notes..."
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitPayment}
              disabled={submittingPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submittingPayment && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

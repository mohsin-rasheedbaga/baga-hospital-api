import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const hid = parseInt(hospital_id, 10);

    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date();

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    // Parallel queries for all report data
    const [
      paymentsResult,
      visitsResult,
      patientsResult,
      labOrdersResult,
      prescriptionsResult,
      surgeriesResult,
      doctorFeesResult,
    ] = await Promise.all([
      // Payments in date range
      supabase
        .from('payments')
        .select(`
          *,
          patient:patients(id, patient_id, full_name),
          visit:visits(id, visit_id)
        `)
        .eq('hospital_id', hid)
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .order('created_at', { ascending: false }),

      // Visits in date range
      supabase
        .from('visits')
        .select('id, patient_id, created_at')
        .eq('hospital_id', hid)
        .gte('visit_date', from ? from : fromDate.toISOString().split('T')[0])
        .lte('visit_date', to ? to : toDate.toISOString().split('T')[0]),

      // Unique patients in date range (from visits)
      supabase
        .from('visits')
        .select('patient_id')
        .eq('hospital_id', hid)
        .gte('visit_date', from ? from : fromDate.toISOString().split('T')[0])
        .lte('visit_date', to ? to : toDate.toISOString().split('T')[0]),

      // Lab orders in date range
      supabase
        .from('lab_orders')
        .select('id, created_at')
        .eq('hospital_id', hid)
        .gte('ordered_at', fromISO)
        .lte('ordered_at', toISO),

      // Prescriptions in date range
      supabase
        .from('prescriptions')
        .select('id, created_at')
        .eq('hospital_id', hid)
        .gte('created_at', fromISO)
        .lte('created_at', toISO),

      // Surgeries in date range
      supabase
        .from('surgeries')
        .select('id, total_charges, status, created_at')
        .eq('hospital_id', hid)
        .gte('created_at', fromISO)
        .lte('created_at', toISO),

      // Doctor fee records in date range
      supabase
        .from('doctor_fee_records')
        .select(`
          *,
          doctor:doctors(id, full_name, specialization)
        `)
        .eq('hospital_id', hid)
        .gte('created_at', fromISO)
        .lte('created_at', toISO),
    ]);

    const payments = paymentsResult.data || [];
    const visits = visitsResult.data || [];
    const patientsWithVisits = patientsResult.data || [];
    const labOrders = labOrdersResult.data || [];
    const prescriptions = prescriptionsResult.data || [];
    const surgeries = surgeriesResult.data || [];
    const doctorFees = doctorFeesResult.data || [];

    // Unique patient count
    const uniquePatientIds = new Set(patientsWithVisits.map((v: { patient_id: number }) => v.patient_id));
    const totalPatients = uniquePatientIds.size;

    // Total revenue from payments
    const totalRevenue = payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    // Revenue by payment_type
    const revenueByType: Record<string, number> = {};
    payments.forEach((p: { payment_type: string | null; amount: number }) => {
      const type = p.payment_type || 'Other';
      revenueByType[type] = (revenueByType[type] || 0) + p.amount;
    });

    // Doctor fee summary
    const doctorSummary: Record<string, { name: string; totalFees: number; hospitalShare: number; doctorShare: number }> = {};
    doctorFees.forEach((f: { doctor: { id: number; full_name: string } | null; total_fee: number; hospital_share: number; doctor_share: number }) => {
      const docName = f.doctor?.full_name || 'Unknown';
      if (!doctorSummary[docName]) {
        doctorSummary[docName] = { name: docName, totalFees: 0, hospitalShare: 0, doctorShare: 0 };
      }
      doctorSummary[docName].totalFees += f.total_fee;
      doctorSummary[docName].hospitalShare += f.hospital_share;
      doctorSummary[docName].doctorShare += f.doctor_share;
    });

    return NextResponse.json({
      totalRevenue,
      totalPatients,
      totalVisits: visits.length,
      totalLabTests: labOrders.length,
      totalPrescriptions: prescriptions.length,
      totalSurgeries: surgeries.length,
      revenueByType,
      recentPayments: payments.slice(0, 20),
      doctorFeeSummary: Object.values(doctorSummary),
      surgeryRevenue: surgeries.reduce((sum: number, s: { total_charges: number }) => sum + s.total_charges, 0),
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

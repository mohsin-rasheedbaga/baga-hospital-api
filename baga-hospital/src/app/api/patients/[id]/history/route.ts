import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const patientId = parseInt(id, 10);

    // Fetch patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch all visits for this patient with doctor name
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select(`
        *,
        doctor:doctors(id, full_name, specialization)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (visitsError) {
      console.error('Visits fetch error:', visitsError);
      return NextResponse.json({ error: visitsError.message }, { status: 500 });
    }

    // For each visit, fetch prescriptions (with medicines), payments, lab orders, surgeries, discharges
    const enrichedVisits = await Promise.all(
      (visits || []).map(async (visit) => {
        const [prescriptionsResult, paymentsResult, labOrdersResult, surgeriesResult, dischargesResult] =
          await Promise.all([
            supabase
              .from('prescriptions')
              .select(`
                *,
                doctor:doctors(id, full_name, specialization),
                medicines:prescription_medicines(*)
              `)
              .eq('visit_id', visit.id),
            supabase
              .from('payments')
              .select('*')
              .eq('visit_id', visit.id),
            supabase
              .from('lab_orders')
              .select(`
                *,
                doctor:doctors(id, full_name),
                reports:lab_reports(*)
              `)
              .eq('visit_id', visit.id),
            supabase
              .from('surgeries')
              .select(`
                *,
                doctor:doctors(id, full_name)
              `)
              .eq('visit_id', visit.id),
            supabase
              .from('discharges')
              .select('*')
              .eq('visit_id', visit.id),
          ]);

        return {
          ...visit,
          prescriptions: prescriptionsResult.data || [],
          payments: paymentsResult.data || [],
          lab_orders: labOrdersResult.data || [],
          surgeries: surgeriesResult.data || [],
          discharge: (dischargesResult.data || [])[0] || null,
        };
      })
    );

    // Calculate totals
    const allPayments = enrichedVisits.flatMap((v) => v.payments);
    const totalSpent = allPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    return NextResponse.json({
      patient,
      visits: enrichedVisits,
      totalVisits: enrichedVisits.length,
      totalSpent,
    });
  } catch (error) {
    console.error('Patient history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

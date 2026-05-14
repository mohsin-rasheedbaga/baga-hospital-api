import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

async function generateId(prefix: string, hospitalId: number, table: string): Promise<string> {
  const { count } = await getSupabase()
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('hospital_id', hospitalId);
  const num = (count || 0) + 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hospital_id,
      visit_id,
      patient_id,
      doctor_id,
      diagnosis,
      summary,
      follow_up_date,
    } = body;

    if (!hospital_id || !visit_id || !patient_id || !doctor_id) {
      return NextResponse.json(
        { error: 'hospital_id, visit_id, patient_id, and doctor_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Fetch visit to get total fees
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('*')
      .eq('id', visit_id)
      .single();

    if (visitError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Fetch surgeries for this visit
    const { data: surgeries } = await supabase
      .from('surgeries')
      .select('total_charges')
      .eq('visit_id', visit_id);

    const surgeryCharges = (surgeries || []).reduce((sum: number, s: { total_charges: number }) => sum + s.total_charges, 0);

    // Calculate total bill
    const total_bill = (visit.total_fee || 0) + surgeryCharges;

    // Calculate total paid
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('visit_id', visit_id);

    const total_paid = (payments || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    // Calculate balance
    const balance = total_bill - total_paid;

    // Check for outstanding balance
    if (balance > 0) {
      return NextResponse.json(
        { error: `Cannot discharge. Outstanding balance: Rs. ${balance}` },
        { status: 400 }
      );
    }

    const discharge_id = await generateId('DIS', hospital_id, 'discharges');

    // Insert discharge
    const { data: discharge, error: dischargeError } = await supabase
      .from('discharges')
      .insert({
        hospital_id,
        visit_id,
        patient_id,
        doctor_id,
        discharge_id,
        diagnosis: diagnosis || null,
        summary: summary || null,
        follow_up_date: follow_up_date || null,
        total_bill,
        total_paid,
        balance,
        status: 'final',
      })
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone),
        doctor:doctors(id, full_name)
      `)
      .single();

    if (dischargeError) {
      console.error('Discharge creation error:', dischargeError);
      return NextResponse.json({ error: dischargeError.message }, { status: 500 });
    }

    // Update visit status to discharged
    await supabase
      .from('visits')
      .update({ status: 'discharged' })
      .eq('id', visit_id);

    return NextResponse.json({ discharge }, { status: 201 });
  } catch (error) {
    console.error('Discharge creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

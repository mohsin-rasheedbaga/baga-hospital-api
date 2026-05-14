import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const supabase = getSupabase();

    // Fetch visit to get total_fee and hospital_charges
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('id, total_fee, hospital_charges, consultation_fee, emergency_fee')
      .eq('id', parseInt(visitId, 10))
      .single();

    if (visitError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Fetch payments for this visit
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('visit_id', parseInt(visitId, 10))
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Visit payments fetch error:', paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // Fetch surgeries for this visit
    const { data: surgeries } = await supabase
      .from('surgeries')
      .select('id, total_charges, includes_hospital_charges, hospital_charges')
      .eq('visit_id', parseInt(visitId, 10));

    const totalSurgeryCost = (surgeries || []).reduce((sum: number, s: { total_charges: number }) => sum + s.total_charges, 0);

    // Calculate bill
    const totalBill = (visit.total_fee || 0) + totalSurgeryCost;
    const totalPaid = (payments || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const balance = totalBill - totalPaid;

    return NextResponse.json({
      payments: payments || [],
      totalBill,
      totalPaid,
      balance,
      visitCharges: {
        consultation_fee: visit.consultation_fee || 0,
        emergency_fee: visit.emergency_fee || 0,
        hospital_charges: visit.hospital_charges || 0,
        total_fee: visit.total_fee || 0,
        surgery_charges: totalSurgeryCost,
      },
    });
  } catch (error) {
    console.error('Visit payments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

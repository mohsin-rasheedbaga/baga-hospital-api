import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const supabase = getSupabase();

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        visit:visits(id, visit_id, visit_type, visit_date)
      `)
      .eq('patient_id', parseInt(patientId, 10))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Patient payments fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalPaid = (payments || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    return NextResponse.json({ payments: payments || [], totalPaid });
  } catch (error) {
    console.error('Patient payments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

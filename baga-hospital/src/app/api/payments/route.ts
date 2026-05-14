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
      patient_id,
      visit_id,
      amount,
      payment_type,
      payment_method,
      received_by,
      notes,
    } = body;

    if (!hospital_id || !patient_id || !visit_id || !amount) {
      return NextResponse.json(
        { error: 'hospital_id, patient_id, visit_id, and amount are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const payment_id = await generateId('PAY', hospital_id, 'payments');

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        hospital_id,
        patient_id,
        visit_id,
        payment_id,
        amount,
        payment_type: payment_type || null,
        payment_method: payment_method || null,
        received_by: received_by || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Payment creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

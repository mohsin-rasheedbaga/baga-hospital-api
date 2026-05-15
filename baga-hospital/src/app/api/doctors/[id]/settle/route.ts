import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fee_record_ids } = body;

    if (!fee_record_ids || !Array.isArray(fee_record_ids) || fee_record_ids.length === 0) {
      return NextResponse.json({ error: 'fee_record_ids array is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const doctorId = parseInt(id, 10);
    const now = new Date().toISOString();

    // Update all specified doctor_fee_records to settled
    const { error } = await supabase
      .from('doctor_fee_records')
      .update({
        status: 'settled',
        settled_at: now,
      })
      .in('id', fee_record_ids)
      .eq('doctor_id', doctorId)
      .eq('status', 'pending');

    if (error) {
      console.error('Doctor fee settle error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settled_count: fee_record_ids.length });
  } catch (error) {
    console.error('Doctor fee settle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

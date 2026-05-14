import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const doctorId = parseInt(id, 10);

    // Fetch doctor info
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Fetch pending fee records with patient names
    const { data: pendingRecords, error: pendingError } = await supabase
      .from('doctor_fee_records')
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone)
      `)
      .eq('doctor_id', doctorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (pendingError) {
      console.error('Pending fee records error:', pendingError);
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    // Fetch settled fee records
    const { data: settledRecords, error: settledError } = await supabase
      .from('doctor_fee_records')
      .select('doctor_share, settled_at')
      .eq('doctor_id', doctorId)
      .eq('status', 'settled');

    if (settledError) {
      console.error('Settled fee records error:', settledError);
    }

    const totalPending = (pendingRecords || []).reduce(
      (sum: number, r: { doctor_share: number }) => sum + r.doctor_share,
      0
    );

    const totalSettled = (settledRecords || []).reduce(
      (sum: number, r: { doctor_share: number }) => sum + r.doctor_share,
      0
    );

    return NextResponse.json({
      doctor,
      total_pending: totalPending,
      total_settled: totalSettled,
      records: pendingRecords || [],
    });
  } catch (error) {
    console.error('Doctor fees fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

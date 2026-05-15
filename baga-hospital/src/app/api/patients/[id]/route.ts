import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = getSupabase();

    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Patient fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

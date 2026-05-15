import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paid_by } = body;

    if (!paid_by) {
      return NextResponse.json({ error: 'paid_by is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: record, error } = await supabase
      .from('salary_records')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: parseInt(String(paid_by), 10),
      })
      .eq('id', parseInt(id, 10))
      .eq('status', 'pending')
      .select(`
        *,
        employee:employees(id, employee_id, full_name, designation)
      `)
      .single();

    if (error || !record) {
      return NextResponse.json(
        { error: 'Salary record not found or already paid' },
        { status: 404 }
      );
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Salary pay error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

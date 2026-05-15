import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');
    const employee_id = searchParams.get('employee_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('salary_records')
      .select(`
        *,
        employee:employees(id, employee_id, full_name, designation, department)
      `)
      .eq('hospital_id', parseInt(hospital_id, 10))
      .order('created_at', { ascending: false });

    if (employee_id) {
      query = query.eq('employee_id', parseInt(employee_id, 10));
    }

    if (month) {
      query = query.eq('month', month);
    }

    if (year) {
      query = query.eq('year', parseInt(year, 10));
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Salary records fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ records: records || [] });
  } catch (error) {
    console.error('Salary records fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

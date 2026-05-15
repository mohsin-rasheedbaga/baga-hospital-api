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
      full_name,
      designation,
      department,
      phone,
      email,
      cnic,
      basic_salary,
      monthly_leaves,
    } = body;

    if (!hospital_id || !full_name || !designation) {
      return NextResponse.json(
        { error: 'hospital_id, full_name, and designation are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const employee_id = await generateId('EMP', hospital_id, 'employees');

    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        hospital_id,
        employee_id,
        full_name,
        designation,
        department: department || null,
        phone: phone || null,
        email: email || null,
        cnic: cnic || null,
        joining_date: new Date().toISOString().split('T')[0],
        basic_salary: basic_salary || 0,
        monthly_leaves: monthly_leaves || 2,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Employee creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error('Employee creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('hospital_id', parseInt(hospital_id, 10))
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Employees fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ employees: employees || [] });
  } catch (error) {
    console.error('Employees fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

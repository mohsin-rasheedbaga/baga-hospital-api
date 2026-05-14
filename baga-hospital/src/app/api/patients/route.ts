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
    const { hospital_id, full_name, age, gender, phone, address, blood_group, cnic, emergency_contact } = body;

    if (!hospital_id || !full_name) {
      return NextResponse.json({ error: 'hospital_id and full_name are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const patient_id = await generateId('PAT', hospital_id, 'patients');

    const { data: patient, error } = await supabase
      .from('patients')
      .insert({
        hospital_id,
        patient_id,
        full_name,
        age: age || null,
        gender: gender || null,
        phone: phone || null,
        address: address || null,
        blood_group: blood_group || null,
        cnic: cnic || null,
        emergency_contact: emergency_contact || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Patient creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error('Patient creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('hospital_id', parseInt(hospital_id, 10))
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,patient_id.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: patients, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Patients fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ patients: patients || [], total: count || 0 });
  } catch (error) {
    console.error('Patients fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

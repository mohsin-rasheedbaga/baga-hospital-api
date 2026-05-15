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
    const { hospital_id, visit_id, patient_id, doctor_id, test_ids } = body;

    if (!hospital_id || !visit_id || !patient_id || !test_ids || test_ids.length === 0) {
      return NextResponse.json(
        { error: 'hospital_id, visit_id, patient_id, and test_ids are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const order_id = await generateId('LAB', hospital_id, 'lab_orders');

    // Calculate total price from lab_test_catalog
    const { data: tests, error: testsError } = await supabase
      .from('lab_test_catalog')
      .select('id, price')
      .in('id', test_ids);

    if (testsError) {
      console.error('Lab test catalog error:', testsError);
      return NextResponse.json({ error: testsError.message }, { status: 500 });
    }

    const total_price = (tests || []).reduce((sum: number, t: { price: number }) => sum + t.price, 0);

    // Insert lab order
    const { data: order, error: orderError } = await supabase
      .from('lab_orders')
      .insert({
        hospital_id,
        visit_id,
        patient_id,
        doctor_id: doctor_id || null,
        order_id,
        test_ids,
        status: 'pending',
        total_price,
      })
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone),
        doctor:doctors(id, full_name)
      `)
      .single();

    if (orderError) {
      console.error('Lab order creation error:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Lab order creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');
    const status = searchParams.get('status');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('lab_orders')
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone),
        doctor:doctors(id, full_name)
      `)
      .eq('hospital_id', parseInt(hospital_id, 10))
      .order('ordered_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Lab orders fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error('Lab orders fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

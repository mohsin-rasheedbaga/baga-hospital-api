import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hospital_id, test_name, test_code, category, price, report_days } = body;

    if (!hospital_id || !test_name) {
      return NextResponse.json({ error: 'hospital_id and test_name are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: test, error } = await supabase
      .from('lab_test_catalog')
      .insert({
        hospital_id,
        test_name,
        test_code: test_code || null,
        category: category || null,
        price: price || 0,
        report_days: report_days || 1,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Lab test creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error('Lab test creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');
    const category = searchParams.get('category');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('lab_test_catalog')
      .select('*')
      .eq('hospital_id', parseInt(hospital_id, 10))
      .eq('is_active', true)
      .order('test_name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: tests, error } = await query;

    if (error) {
      console.error('Lab catalog fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tests: tests || [] });
  } catch (error) {
    console.error('Lab catalog fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

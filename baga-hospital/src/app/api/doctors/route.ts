import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hospital_id,
      full_name,
      specialization,
      qualification,
      phone,
      consultation_fee,
      hospital_sharing_percent,
      doctor_sharing_percent,
    } = body;

    if (!hospital_id || !full_name) {
      return NextResponse.json({ error: 'hospital_id and full_name are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: doctor, error } = await supabase
      .from('doctors')
      .insert({
        hospital_id,
        full_name,
        specialization: specialization || null,
        qualification: qualification || null,
        phone: phone || null,
        consultation_fee: consultation_fee || 0,
        hospital_sharing_percent: hospital_sharing_percent || 30,
        doctor_sharing_percent: doctor_sharing_percent || 70,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Doctor creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ doctor }, { status: 201 });
  } catch (error) {
    console.error('Doctor creation error:', error);
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

    const { data: doctors, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('hospital_id', parseInt(hospital_id, 10))
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Doctors fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ doctors: doctors || [] });
  } catch (error) {
    console.error('Doctors fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

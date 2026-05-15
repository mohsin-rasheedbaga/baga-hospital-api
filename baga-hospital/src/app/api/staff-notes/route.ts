import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hospital_id, patient_id, visit_id, staff_id, note_type, content } = body;

    if (!hospital_id || !patient_id || !visit_id || !staff_id || !content) {
      return NextResponse.json(
        { error: 'hospital_id, patient_id, visit_id, staff_id, and content are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: note, error } = await supabase
      .from('staff_notes')
      .insert({
        hospital_id,
        patient_id,
        visit_id,
        staff_id,
        note_type: note_type || 'general',
        content,
      })
      .select(`
        *,
        staff:hospital_users(id, full_name, role)
      `)
      .single();

    if (error) {
      console.error('Staff note creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Staff note creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');
    const patient_id = searchParams.get('patient_id');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('staff_notes')
      .select(`
        *,
        staff:hospital_users(id, full_name, role)
      `)
      .eq('hospital_id', parseInt(hospital_id, 10))
      .order('created_at', { ascending: false });

    if (patient_id) {
      query = query.eq('patient_id', parseInt(patient_id, 10));
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('Staff notes fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (error) {
    console.error('Staff notes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

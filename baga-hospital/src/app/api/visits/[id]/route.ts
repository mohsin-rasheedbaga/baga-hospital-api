import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data: visit, error } = await supabase
      .from('visits')
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone, gender, age, blood_group),
        doctor:doctors(id, user_id, full_name, specialization, qualification)
      `)
      .eq('id', parseInt(id, 10))
      .single();

    if (error || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    return NextResponse.json({ visit });
  } catch (error) {
    console.error('Visit fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.consultation_fee !== undefined) updates.consultation_fee = body.consultation_fee;
    if (body.emergency_fee !== undefined) updates.emergency_fee = body.emergency_fee;
    if (body.hospital_charges !== undefined) updates.hospital_charges = body.hospital_charges;
    if (body.total_fee !== undefined) updates.total_fee = body.total_fee;
    if (body.doctor_id !== undefined) updates.doctor_id = body.doctor_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: visit, error } = await supabase
      .from('visits')
      .update(updates)
      .eq('id', parseInt(id, 10))
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone, gender),
        doctor:doctors(id, full_name, specialization)
      `)
      .single();

    if (error || !visit) {
      return NextResponse.json({ error: 'Visit not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ visit });
  } catch (error) {
    console.error('Visit update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

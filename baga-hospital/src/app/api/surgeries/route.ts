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
      visit_id,
      patient_id,
      doctor_id,
      surgery_type,
      surgery_name,
      doctor_fee,
      hospital_charges,
      total_charges,
      includes_hospital_charges,
      surgery_date,
      notes,
    } = body;

    if (!hospital_id || !visit_id || !patient_id || !doctor_id || !surgery_name) {
      return NextResponse.json(
        { error: 'hospital_id, visit_id, patient_id, doctor_id, and surgery_name are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const surgery_id = await generateId('SUR', hospital_id, 'surgeries');

    // Insert surgery
    const { data: surgery, error: surgeryError } = await supabase
      .from('surgeries')
      .insert({
        hospital_id,
        visit_id,
        patient_id,
        doctor_id,
        surgery_id,
        surgery_type: surgery_type || null,
        surgery_name,
        doctor_fee: doctor_fee || 0,
        hospital_charges: hospital_charges || 0,
        total_charges: total_charges || 0,
        includes_hospital_charges: includes_hospital_charges || false,
        surgery_date: surgery_date || null,
        status: 'scheduled',
        notes: notes || null,
      })
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone),
        doctor:doctors(id, full_name)
      `)
      .single();

    if (surgeryError) {
      console.error('Surgery creation error:', surgeryError);
      return NextResponse.json({ error: surgeryError.message }, { status: 500 });
    }

    // If includes_hospital_charges is false, update visit's hospital_charges
    if (!includes_hospital_charges && hospital_charges) {
      // First get the current visit
      const { data: currentVisit } = await supabase
        .from('visits')
        .select('hospital_charges, total_fee')
        .eq('id', visit_id)
        .single();

      if (currentVisit) {
        const newHospitalCharges = (currentVisit.hospital_charges || 0) + hospital_charges;
        const newTotalFee = (currentVisit.total_fee || 0) + hospital_charges;

        await supabase
          .from('visits')
          .update({
            hospital_charges: newHospitalCharges,
            total_fee: newTotalFee,
          })
          .eq('id', visit_id);
      }
    }

    return NextResponse.json({ surgery }, { status: 201 });
  } catch (error) {
    console.error('Surgery creation error:', error);
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

    const { data: surgeries, error } = await supabase
      .from('surgeries')
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone),
        doctor:doctors(id, full_name)
      `)
      .eq('hospital_id', parseInt(hospital_id, 10))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Surgeries fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ surgeries: surgeries || [] });
  } catch (error) {
    console.error('Surgeries fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

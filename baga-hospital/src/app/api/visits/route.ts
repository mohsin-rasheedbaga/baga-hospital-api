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
      patient_id,
      visit_type,
      doctor_id,
      emergency_fee,
      consultation_fee,
      hospital_charges,
      notes,
    } = body;

    if (!hospital_id || !patient_id || !visit_type) {
      return NextResponse.json({ error: 'hospital_id, patient_id, and visit_type are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const visit_id = await generateId('VIS', hospital_id, 'visits');

    // Calculate total fee based on visit type
    const emergencyFee = emergency_fee || 0;
    const consultationFee = consultation_fee || 0;
    const hospitalCharges = hospital_charges || 0;
    let total_fee = 0;

    if (visit_type === 'opd' || visit_type === 'followup') {
      total_fee = consultationFee + hospitalCharges;
    } else if (visit_type === 'emergency') {
      total_fee = emergencyFee + hospitalCharges;
    }

    // Get doctor's fee info if doctor_id is provided
    let finalConsultationFee = consultationFee;
    let hospitalSharingPercent = 0;

    if (doctor_id) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctor_id)
        .single();

      if (doctor) {
        hospitalSharingPercent = doctor.hospital_sharing_percent || 0;
        // Use doctor's consultation fee if not explicitly provided
        if (!consultation_fee) {
          finalConsultationFee = doctor.consultation_fee || 0;
          if (visit_type === 'opd' || visit_type === 'followup') {
            total_fee = finalConsultationFee + hospitalCharges;
          }
        }
      }
    }

    // Create visit
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({
        hospital_id,
        patient_id,
        visit_id,
        visit_type,
        doctor_id: doctor_id || null,
        emergency_fee: emergencyFee,
        consultation_fee: finalConsultationFee,
        total_fee,
        hospital_charges: hospitalCharges,
        status: 'active',
        visit_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (visitError) {
      console.error('Visit creation error:', visitError);
      return NextResponse.json({ error: visitError.message }, { status: 500 });
    }

    // Auto-create doctor_fee_record if doctor_id is provided
    let fee_record = null;
    if (doctor_id && finalConsultationFee > 0) {
      const hospital_share = Math.round((finalConsultationFee * hospitalSharingPercent) / 100);
      const doctor_share = finalConsultationFee - hospital_share;

      const { data: feeRecord, error: feeError } = await supabase
        .from('doctor_fee_records')
        .insert({
          hospital_id,
          doctor_id,
          visit_id: visit.id,
          patient_id,
          total_fee: finalConsultationFee,
          hospital_share,
          doctor_share,
          status: 'pending',
        })
        .select()
        .single();

      if (!feeError) {
        fee_record = feeRecord;
      } else {
        console.error('Doctor fee record creation error:', feeError);
      }
    }

    return NextResponse.json({ visit, fee_record }, { status: 201 });
  } catch (error) {
    console.error('Visit creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('visits')
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone, gender),
        doctor:doctors(id, user_id, full_name, specialization)
      `)
      .eq('hospital_id', parseInt(hospital_id, 10))
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('visit_date', date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: visits, error } = await query;

    if (error) {
      console.error('Visits fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ visits: visits || [] });
  } catch (error) {
    console.error('Visits fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

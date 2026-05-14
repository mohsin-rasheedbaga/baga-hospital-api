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
      diagnosis,
      notes,
      medicines,
    } = body;

    if (!hospital_id || !visit_id || !patient_id || !doctor_id) {
      return NextResponse.json(
        { error: 'hospital_id, visit_id, patient_id, and doctor_id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const rx_id = await generateId('RX', hospital_id, 'prescriptions');

    // Insert prescription
    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .insert({
        hospital_id,
        visit_id,
        patient_id,
        doctor_id,
        rx_id,
        diagnosis: diagnosis || null,
        notes: notes || null,
        is_printed: false,
      })
      .select()
      .single();

    if (rxError) {
      console.error('Prescription creation error:', rxError);
      return NextResponse.json({ error: rxError.message }, { status: 500 });
    }

    // Insert prescription medicines
    if (medicines && medicines.length > 0) {
      const medicineRows = medicines.map((med: {
        medicine_name: string;
        dosage?: string;
        frequency?: string;
        duration_days?: number;
        instructions?: string;
        quantity?: number;
      }) => ({
        prescription_id: prescription.id,
        medicine_name: med.medicine_name,
        dosage: med.dosage || null,
        frequency: med.frequency || null,
        duration_days: med.duration_days || 1,
        instructions: med.instructions || null,
        quantity: med.quantity || 1,
      }));

      const { error: medError } = await supabase
        .from('prescription_medicines')
        .insert(medicineRows);

      if (medError) {
        console.error('Prescription medicines error:', medError);
        // Don't fail the whole request, just log the error
      }
    }

    // Fetch the full prescription with medicines
    const { data: fullPrescription } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:doctors(id, full_name, specialization),
        medicines:prescription_medicines(*)
      `)
      .eq('id', prescription.id)
      .single();

    return NextResponse.json({ prescription: fullPrescription || prescription }, { status: 201 });
  } catch (error) {
    console.error('Prescription creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

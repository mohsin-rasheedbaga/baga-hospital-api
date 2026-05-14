import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reports } = body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json({ error: 'reports array is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const orderId = parseInt(id, 10);

    // Fetch the lab order to get hospital_id and patient_id
    const { data: labOrder, error: orderError } = await supabase
      .from('lab_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !labOrder) {
      return NextResponse.json({ error: 'Lab order not found' }, { status: 404 });
    }

    // Create lab reports for each test
    const reportRows = reports.map((report: {
      test_id: number;
      test_name: string;
      result_values: Array<{ parameter: string; value: string; unit: string; range: string }>;
      remarks?: string;
    }) => ({
      lab_order_id: orderId,
      hospital_id: labOrder.hospital_id,
      patient_id: labOrder.patient_id,
      test_id: report.test_id,
      test_name: report.test_name,
      result_values: report.result_values,
      remarks: report.remarks || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }));

    const { error: reportsError } = await supabase
      .from('lab_reports')
      .insert(reportRows);

    if (reportsError) {
      console.error('Lab reports creation error:', reportsError);
      return NextResponse.json({ error: reportsError.message }, { status: 500 });
    }

    // Update lab order status to completed
    const { data: updatedOrder, error: updateError } = await supabase
      .from('lab_orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(`
        *,
        patient:patients(id, patient_id, full_name, phone),
        doctor:doctors(id, full_name),
        reports:lab_reports(*)
      `)
      .single();

    if (updateError) {
      console.error('Lab order update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Lab order complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

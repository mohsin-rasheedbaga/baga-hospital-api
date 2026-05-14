import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospital_id = searchParams.get('hospital_id');

    if (!hospital_id) {
      return NextResponse.json({ error: 'hospital_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const hid = parseInt(hospital_id, 10);

    // Get today's date string (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Parallel queries for all stats
    const [
      todayVisitsResult,
      todayPatientsResult,
      activePatientsResult,
      todayRevenueResult,
      pendingDoctorFeesResult,
      pendingLabOrdersResult,
      activeDoctorsResult,
    ] = await Promise.all([
      // Today's visits
      supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .eq('visit_date', today),

      // Today's new patients
      supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString()),

      // Total active patients
      supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .eq('is_active', true),

      // Today's revenue (payments created today)
      supabase
        .from('payments')
        .select('amount')
        .eq('hospital_id', hid)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString()),

      // Pending doctor fees
      supabase
        .from('doctor_fee_records')
        .select('doctor_share')
        .eq('hospital_id', hid)
        .eq('status', 'pending'),

      // Pending lab orders
      supabase
        .from('lab_orders')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .neq('status', 'completed'),

      // Active doctors
      supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hid)
        .eq('is_active', true),
    ]);

    const todayRevenue = (todayRevenueResult.data || []).reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );

    const pendingFeesAmount = (pendingDoctorFeesResult.data || []).reduce(
      (sum: number, r: { doctor_share: number }) => sum + r.doctor_share,
      0
    );

    return NextResponse.json({
      todayVisits: todayVisitsResult.count || 0,
      todayNewPatients: todayPatientsResult.count || 0,
      totalActivePatients: activePatientsResult.count || 0,
      todayRevenue,
      pendingDoctorFees: pendingDoctorFeesResult.count || 0,
      pendingDoctorFeesAmount: pendingFeesAmount,
      pendingLabOrders: pendingLabOrdersResult.count || 0,
      activeDoctors: activeDoctorsResult.count || 0,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

// Generate license key: BAGA-XXXXX-XXXXX
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const gen = (len: number) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `BAGA-${gen(5)}-${gen(5)}`;
}

function calculateExpiry(duration: string): string | null {
  if (duration === 'lifetime') return null;
  const now = new Date();
  const months: Record<string, number> = {
    '1_month': 1,
    '3_months': 3,
    '6_months': 6,
    '1_year': 12,
  };
  const m = months[duration] || 1;
  now.setMonth(now.getMonth() + m);
  return now.toISOString().split('T')[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please log in as admin.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !license) {
      return NextResponse.json({ success: false, error: 'Hospital not found' }, { status: 404 });
    }

    // Get users for this hospital
    const { data: users } = await supabase
      .from('hospital_users')
      .select('id, username, full_name, role, is_active, created_at')
      .eq('hospital_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      hospital: license,
      users: users || [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please log in as admin.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    const updateData: Record<string, unknown> = {};
    if (body.hospital_name !== undefined) updateData.hospital_name = body.hospital_name.trim();
    if (body.address !== undefined) updateData.address = body.address.trim();
    if (body.phone !== undefined) updateData.phone = body.phone.trim();
    if (body.status !== undefined) updateData.status = body.status;
    if (body.features !== undefined) updateData.features = body.features;

    // If duration changed, recalculate expiry
    if (body.license_duration) {
      updateData.license_duration = body.license_duration;
      updateData.expiry_date = calculateExpiry(body.license_duration);
      if (body.license_duration === 'lifetime') {
        updateData.status = 'active';
      }
    }

    const { data: license, error } = await supabase
      .from('licenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !license) {
      return NextResponse.json(
        { success: false, error: 'Failed to update hospital' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, hospital: license });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please log in as admin.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // Deactivate license instead of deleting
    const { error } = await supabase
      .from('licenses')
      .update({ status: 'inactive' })
      .eq('id', id);

    // Deactivate all users for this hospital
    await supabase
      .from('hospital_users')
      .update({ is_active: false })
      .eq('hospital_id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to deactivate hospital' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Hospital deactivated successfully' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST - Regenerate license key for a hospital
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please log in as admin.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    if (body.action === 'regenerate_license') {
      const newLicenseKey = generateLicenseKey();

      // Get current license to preserve duration
      const { data: currentLicense } = await supabase
        .from('licenses')
        .select('license_duration')
        .eq('id', id)
        .single();

      const duration = currentLicense?.license_duration || '1_month';

      const { data: license, error } = await supabase
        .from('licenses')
        .update({
          license_key: newLicenseKey,
          status: 'active',
          expiry_date: calculateExpiry(duration),
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !license) {
        return NextResponse.json(
          { success: false, error: 'Failed to regenerate license' },
          { status: 500 }
        );
      }

      // Update all users' license_key reference
      await supabase
        .from('hospital_users')
        .update({ license_key: newLicenseKey })
        .eq('hospital_id', id);

      return NextResponse.json({
        success: true,
        license_key: newLicenseKey,
        expiry_date: license.expiry_date,
        message: 'New license key generated',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

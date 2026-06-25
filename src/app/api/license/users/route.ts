import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * POST /api/license/users
 *
 * Called by the Electron desktop app to sync ALL hospital users (including
 * passwords) from Supabase into the local SQLite database. This is essential
 * for LAN sharing: when a browser on another PC tries to log in, the Electron
 * host's /api/login endpoint checks local SQLite — so all users must be cached
 * there.
 *
 * Request body: { license_key: string }
 * Response: { success: true, users: [{ id, username, password, full_name, role, is_active }, ...] }
 *
 * Security: this endpoint requires a valid license_key. It returns passwords
 * in plaintext (same as the existing admin panel does) because the desktop app
 * needs them for local credential matching during LAN login.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key } = body;

    if (!license_key) {
      return NextResponse.json(
        { success: false, error: 'License key is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify the license key is valid and active
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('id, hospital_name, status, features, expiry_date, license_duration')
      .eq('license_key', license_key)
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { success: false, error: 'Invalid license key' },
        { status: 401 }
      );
    }

    if (license.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'License is inactive' },
        { status: 401 }
      );
    }

    // Check expiry (skip for lifetime)
    if (license.license_duration !== 'lifetime' && license.expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(license.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        return NextResponse.json(
          { success: false, error: 'License expired on ' + license.expiry_date },
          { status: 401 }
        );
      }
    }

    // Fetch ALL users for this hospital (including passwords for local auth)
    const { data: users, error: usersError } = await supabase
      .from('hospital_users')
      .select('id, username, password, full_name, role, is_active, hospital_name')
      .eq('hospital_id', license.id)
      .eq('is_active', true);

    if (usersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users: ' + usersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hospital_id: license.id,
      hospital_name: license.hospital_name,
      features: license.features,
      user_count: users?.length || 0,
      users: (users || []).map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        full_name: u.full_name || u.username,
        role: u.role || 'staff',
        is_active: u.is_active !== false,
        hospital_name: u.hospital_name || license.hospital_name,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('License users sync error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Step 1: Find user by username and password
    const { data: user, error: userError } = await supabase
      .from('hospital_users')
      .select('id, full_name, username, role, hospital_id, is_active')
      .eq('username', username)
      .eq('password', password)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Step 2: If license_key provided, verify it matches
    if (license_key) {
      const { data: license, error: licenseError } = await supabase
        .from('licenses')
        .select('id, hospital_name, status, features, license_duration, expiry_date')
        .eq('license_key', license_key)
        .eq('id', user.hospital_id)
        .single();

      if (licenseError || !license) {
        return NextResponse.json(
          { success: false, error: 'License key does not match this hospital' },
          { status: 401 }
        );
      }

      if (license.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'License is inactive' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          role: user.role,
          hospital_id: user.hospital_id,
        },
        hospital: {
          name: license.hospital_name,
          features: license.features,
          license_duration: license.license_duration,
        },
      });
    }

    // Step 3: No license_key - just validate user + hospital
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('hospital_name, features, license_duration, status, expiry_date')
      .eq('id', user.hospital_id)
      .single();

    if (licenseError || !license || license.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Hospital license is inactive' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        hospital_id: user.hospital_id,
      },
      hospital: {
        name: license.hospital_name,
        features: license.features,
        license_duration: license.license_duration,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Login error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

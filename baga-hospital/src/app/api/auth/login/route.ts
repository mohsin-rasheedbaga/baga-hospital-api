import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, username, password } = body;

    if (!license_key || !username || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Step 1: Validate license
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single();

    if (licenseError || !license) {
      return NextResponse.json({ error: 'Invalid license key' }, { status: 401 });
    }

    if (license.status !== 'active') {
      return NextResponse.json({ error: 'License is inactive' }, { status: 401 });
    }

    if (license.license_duration !== 'lifetime' && license.expiry_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(license.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        await supabase
          .from('licenses')
          .update({ status: 'inactive' })
          .eq('id', license.id);

        return NextResponse.json({ error: 'License is inactive' }, { status: 401 });
      }
    }

    // Step 2: Find user
    const { data: user, error: userError } = await supabase
      .from('hospital_users')
      .select('id, full_name, username, role, hospital_id, is_active')
      .eq('username', username)
      .eq('password', password)
      .eq('hospital_id', license.id)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({
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
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

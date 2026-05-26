import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key } = body;

    if (!license_key) {
      return NextResponse.json({ valid: false, error: 'License key is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Query licenses table
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single();

    if (error || !license) {
      return NextResponse.json({ valid: false, error: 'Invalid license key' }, { status: 401 });
    }

    // Check if license is active
    if (license.status !== 'active') {
      return NextResponse.json({ valid: false, error: 'License is inactive' }, { status: 401 });
    }

    // Check expiry (skip for lifetime)
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
        return NextResponse.json(
          { valid: false, error: 'License expired on ' + license.expiry_date },
          { status: 401 }
        );
      }
    }

    // Fetch admin user credentials for this hospital
    const { data: adminUser } = await supabase
      .from('hospital_users')
      .select('username, password, role')
      .eq('hospital_id', license.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    return NextResponse.json({
      valid: true,
      hospital_name: license.hospital_name || 'BAGA Hospital',
      hospital_id: license.id,
      features: license.features,
      license_duration: license.license_duration,
      expiry_date: license.expiry_date,
      check_frequency_days: license.check_frequency_days,
      address: license.address,
      phone: license.phone,
      username: adminUser?.username || null,
      password: adminUser?.password || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('License check error:', msg);
    return NextResponse.json({ valid: false, error: msg }, { status: 500 });
  }
}

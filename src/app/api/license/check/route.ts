import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, machine_id } = body;

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

    // MACHINE ID CHECK — prevent activation on multiple computers
    // If license already has an activated_machine_id, check if it matches
    if (license.activated_machine_id && machine_id) {
      if (license.activated_machine_id !== machine_id) {
        // License is already activated on a different machine
        return NextResponse.json({
          valid: false,
          error: `This license is already activated on another computer (ID: ${license.activated_machine_id.substring(0, 8)}...). Each license can only be used on one computer. Please contact support to transfer the license.`,
          already_activated: true,
          activated_machine_id: license.activated_machine_id,
        }, { status: 403 });
      }
    }

    // If no machine_id is set yet, save the current one
    if (!license.activated_machine_id && machine_id) {
      await supabase
        .from('licenses')
        .update({
          activated_machine_id: machine_id,
          activated_at: new Date().toISOString(),
        })
        .eq('id', license.id);
      console.log(`[License] Machine ID saved for license ${license_key.substring(0, 10)}...: ${machine_id}`);
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
      email: license.email || null,
      mobile: license.mobile || null,
      logo_url: license.logo_url || null,
      username: adminUser?.username || null,
      activated_machine_id: license.activated_machine_id || machine_id || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('License check error:', msg);
    return NextResponse.json({ valid: false, error: msg }, { status: 500 });
  }
}

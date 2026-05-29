import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

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

// Calculate expiry date based on duration
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

// Generate username from hospital name
function generateUsername(hospitalName: string): string {
  const prefix = hospitalName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 12);
  const digits = Math.floor(100 + Math.random() * 900);
  return `${prefix}${digits}`;
}

// Generate password from hospital name
function generatePassword(hospitalName: string): string {
  const prefix = hospitalName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${digits}`;
}

// GET /api/admin/hospitals - List all hospitals with licenses
export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get user count for each hospital
    const { data: users } = await supabase
      .from('hospital_users')
      .select('hospital_id, id');

    const userCounts: Record<number, number> = {};
    if (users) {
      for (const u of users) {
        userCounts[u.hospital_id] = (userCounts[u.hospital_id] || 0) + 1;
      }
    }

    // Get admin user credentials for each hospital
    const { data: adminUsers } = await supabase
      .from('hospital_users')
      .select('hospital_id, username, password')
      .eq('role', 'admin');

    const adminCredentials: Record<number, { username: string; password: string }> = {};
    if (adminUsers) {
      for (const u of adminUsers) {
        adminCredentials[u.hospital_id] = {
          username: u.username,
          password: u.password,
        };
      }
    }

    const hospitals = (licenses || []).map((l: Record<string, unknown>) => ({
      id: l.id,
      hospital_name: l.hospital_name,
      address: l.address,
      phone: l.phone,
      license_key: l.license_key,
      status: l.status,
      license_duration: l.license_duration,
      expiry_date: l.expiry_date,
      features: l.features,
      created_at: l.created_at,
      user_count: userCounts[(l.id as number)] || 0,
      admin_username: adminCredentials[(l.id as number)]?.username || null,
      admin_password: adminCredentials[(l.id as number)]?.password || null,
    }));

    return NextResponse.json({ success: true, hospitals });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/admin/hospitals - Create new hospital with license
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hospital_name, address, phone, license_duration, features, charges, notes } = body;

    if (!hospital_name) {
      return NextResponse.json(
        { success: false, error: 'Hospital name is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const licenseKey = generateLicenseKey();
    const duration = license_duration || '1_month';
    const expiryDate = calculateExpiry(duration);

    // Auto-generate admin credentials FIRST (needed for NOT NULL columns)
    const username = generateUsername(hospital_name);
    const password = generatePassword(hospital_name);

    // Create license (include all NOT NULL fields: name, hospital_name, license_key, username, password)
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        name: hospital_name.trim(),
        hospital_name: hospital_name.trim(),
        address: (address || '').trim(),
        phone: (phone || '').trim(),
        license_key: licenseKey,
        username: username,
        password: password,
        status: 'active',
        license_duration: duration,
        expiry_date: expiryDate,
        features: features || ['all'],
        check_frequency_days: 1,
        charges: charges || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { success: false, error: 'Failed to create license: ' + (licenseError?.message || 'Unknown error') },
        { status: 500 }
      );
    }

    // Create admin user for this hospital
    const { error: userError } = await supabase
      .from('hospital_users')
      .insert({
        username,
        password,
        full_name: 'Hospital Admin',
        role: 'admin',
        hospital_id: license.id,
        hospital_name: hospital_name.trim(),
        license_key: licenseKey,
        is_active: true,
      });

    if (userError) {
      console.error('Failed to create user:', userError.message);
      // License was created but user wasn't - return partial success
      return NextResponse.json({
        success: true,
        warning: 'License created but admin user creation failed',
        license: {
          id: license.id,
          hospital_name: license.hospital_name,
          license_key: license.license_key,
          license_duration: license.license_duration,
          expiry_date: license.expiry_date,
          status: license.status,
          charges: license.charges,
          notes: license.notes,
        },
        credentials: null,
      });
    }

    return NextResponse.json({
      success: true,
      license: {
        id: license.id,
        hospital_name: license.hospital_name,
        license_key: license.license_key,
        license_duration: license.license_duration,
        expiry_date: license.expiry_date,
        status: license.status,
        charges: license.charges,
        notes: license.notes,
      },
      credentials: {
        username,
        password,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

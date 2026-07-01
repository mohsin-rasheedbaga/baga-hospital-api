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

// Generate username from hospital/pharmacy FIRST NAME + 3 random digits
// Example: "Baga Pharmacy" → "baga123", "Asad Medical Store" → "asad456"
function generateUsername(hospitalName: string): string {
  // Get the first word of the hospital/pharmacy name
  const firstName = hospitalName
    .trim()
    .split(/\s+/)[0] // first word only
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // remove non-alphanumeric
  // 3 random digits (100-999)
  const digits = Math.floor(100 + Math.random() * 900);
  return `${firstName}${digits}`;
}

// Generate password (random, can be changed later by user)
function generatePassword(hospitalName: string): string {
  // Use first name + 4 random digits
  const firstName = hospitalName
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${firstName}${digits}`;
}

// Map license_type to features array
function getFeaturesForLicenseType(licenseType: string): string[] {
  const map: Record<string, string[]> = {
    hospital: ['all'],
    clinic: ['clinic', 'reception', 'doctor', 'pharmacy', 'lab'],
    pharmacy: ['pharmacy'],
    lab: ['lab'],
  };
  return map[licenseType] || ['all'];
}

// Derive license_type from features array (backward compatibility)
function getLicenseTypeFromFeatures(features: string[]): string {
  if (!features || features.length === 0) return 'hospital';
  if (features.includes('all')) return 'hospital';
  if (features.length === 1 && features[0] === 'pharmacy') return 'pharmacy';
  if (features.length === 1 && features[0] === 'lab') return 'lab';
  if (features.includes('clinic')) return 'clinic';
  return 'hospital';
}

// GET /api/admin/hospitals - List all hospitals with licenses
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please log in as admin.' }, { status: 401 });
  }
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
      email: l.email || null,
      mobile: l.mobile || null,
      logo_url: l.logo_url || null,
      license_key: l.license_key,
      status: l.status,
      license_duration: l.license_duration,
      expiry_date: l.expiry_date,
      features: l.features,
      license_type: getLicenseTypeFromFeatures(l.features as string[]),
      created_at: l.created_at,
      activated_machine_id: l.activated_machine_id || null,
      activated_at: l.activated_at || null,
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
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please log in as admin.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { hospital_name, address, phone, email, mobile, logo_url, license_duration, features, charges, notes, license_type } = body;

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
    const validLicenseTypes = ['hospital', 'clinic', 'pharmacy', 'lab'];
    const resolvedLicenseType = validLicenseTypes.includes(license_type) ? license_type : 'hospital';
    const resolvedFeatures = getFeaturesForLicenseType(resolvedLicenseType);

    // Auto-generate admin credentials FIRST (needed for NOT NULL columns)
    const username = generateUsername(hospital_name);
    const password = generatePassword(hospital_name);

    // Create license (include only columns that exist in the schema)
    const insertData: Record<string, unknown> = {
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
      features: resolvedFeatures,
      check_frequency_days: 1,
    };

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert(insertData)
      .select()
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { success: false, error: 'Failed to create license: ' + (licenseError?.message || 'Unknown error') },
        { status: 500 }
      );
    }

    // Try to update with extra fields (email, mobile, logo_url) if columns exist
    try {
      const extraFields: Record<string, string | null> = {};
      if (email) extraFields.email = email.trim();
      if (mobile) extraFields.mobile = mobile.trim();
      if (logo_url) extraFields.logo_url = logo_url.trim();
      if (Object.keys(extraFields).length > 0) {
        await supabase.from('licenses').update(extraFields).eq('id', license.id);
      }
    } catch (updateErr) {
      console.log('Extra fields update skipped (columns may not exist):', updateErr);
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
          charges: charges || null,
          notes: notes || null,
          license_type: resolvedLicenseType,
        },
        credentials: null,
        reception_credentials: null,
      });
    }

    // For hospital and clinic types, also create a reception user
    let receptionCredentials: { username: string; password: string } | null = null;
    if (resolvedLicenseType === 'hospital' || resolvedLicenseType === 'clinic') {
      const receptionUsername = generateUsername(`reception_${hospital_name}`);
      const receptionPassword = generatePassword(`reception_${hospital_name}`);
      const { error: receptionError } = await supabase
        .from('hospital_users')
        .insert({
          username: receptionUsername,
          password: receptionPassword,
          full_name: 'Reception',
          role: 'reception',
          hospital_id: license.id,
          hospital_name: hospital_name.trim(),
          license_key: licenseKey,
          is_active: true,
        });
      if (!receptionError) {
        receptionCredentials = { username: receptionUsername, password: receptionPassword };
      } else {
        console.error('Failed to create reception user:', receptionError.message);
      }
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
        charges: charges || null,
        notes: notes || null,
        license_type: resolvedLicenseType,
      },
      credentials: {
        username,
        password,
      },
      reception_credentials: receptionCredentials,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

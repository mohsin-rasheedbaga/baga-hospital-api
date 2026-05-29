import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/admin/hospitals/[id]/users - List users for a hospital
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data: users, error } = await supabase
      .from('hospital_users')
      .select('id, username, full_name, role, hospital_name, is_active, created_at')
      .eq('hospital_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, users: users || [] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/admin/hospitals/[id]/users - Add user to a hospital
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, password, full_name, role } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Username, password, and role are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get hospital info
    const { data: license } = await supabase
      .from('licenses')
      .select('hospital_name, license_key, features')
      .eq('id', id)
      .single();

    if (!license) {
      return NextResponse.json(
        { success: false, error: 'Hospital not found' },
        { status: 404 }
      );
    }

    // Derive license_type from features and validate role
    const LICENSE_TYPE_ROLES: Record<string, string[]> = {
      hospital: ['admin', 'doctor', 'reception', 'lab', 'pharmacy', 'hr', 'xray', 'ultrasound', 'accounts', 'staff'],
      clinic: ['admin', 'doctor', 'reception', 'pharmacy', 'lab'],
      pharmacy: ['admin', 'pharmacy'],
      lab: ['admin', 'lab'],
    };

    const licenseFeatures = (license.features || []) as string[];
    let licenseType = 'hospital';
    if (!licenseFeatures.includes('all')) {
      if (licenseFeatures.length === 1 && licenseFeatures[0] === 'pharmacy') licenseType = 'pharmacy';
      else if (licenseFeatures.length === 1 && licenseFeatures[0] === 'lab') licenseType = 'lab';
      else if (licenseFeatures.includes('clinic')) licenseType = 'clinic';
    }

    const allowedRoles = LICENSE_TYPE_ROLES[licenseType] || LICENSE_TYPE_ROLES.hospital;
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Role "${role}" is not allowed for license type "${licenseType}". Allowed roles: ${allowedRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate username
    const { data: existingUser } = await supabase
      .from('hospital_users')
      .select('id')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      );
    }

    const { data: user, error } = await supabase
      .from('hospital_users')
      .insert({
        username: username.trim(),
        password: password,
        full_name: (full_name || 'User').trim(),
        role,
        hospital_id: parseInt(id),
        hospital_name: license.hospital_name,
        license_key: license.license_key,
        is_active: true,
      })
      .select()
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user: ' + (error?.message || 'Unknown error') },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

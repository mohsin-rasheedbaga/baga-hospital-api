import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    const updateData: Record<string, unknown> = {};
    if (body.username !== undefined) updateData.username = body.username.trim();
    if (body.password !== undefined) updateData.password = body.password;
    if (body.full_name !== undefined) updateData.full_name = body.full_name.trim();
    if (body.role !== undefined) updateData.role = body.role;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: user, error } = await supabase
      .from('hospital_users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, full_name, role, is_active')
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('hospital_users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to deactivate user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'User deactivated' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

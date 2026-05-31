import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const hospitalName = (formData.get('hospital_name') as string) || 'unknown';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Only PNG, JPG, and WebP are allowed.' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 2MB allowed.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const bucketName = 'hospital-logos';

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const safeName = hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    const fileName = `${safeName}-${timestamp}.${ext}`;

    // Upload to Supabase storage
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Try to upload to storage bucket
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, uint8Array, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        // If bucket doesn't exist, fall back to converting to base64 and storing as URL
        console.warn('Storage upload failed, using base64 fallback:', uploadError.message);

        // Base64 fallback - convert to data URL
        const base64 = Buffer.from(uint8Array).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        return NextResponse.json({
          success: true,
          url: dataUrl,
          method: 'base64',
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      return NextResponse.json({
        success: true,
        url: urlData.publicUrl,
        method: 'storage',
      });
    } catch (storageError) {
      // Storage not available - use base64 fallback
      console.warn('Storage not available, using base64 fallback:', storageError);
      const base64 = Buffer.from(uint8Array).toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      return NextResponse.json({
        success: true,
        url: dataUrl,
        method: 'base64',
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

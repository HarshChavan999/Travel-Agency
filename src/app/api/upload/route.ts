import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, type ImageCategory } from '@/lib/r2-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as ImageCategory | null;
    const userId = formData.get('userId') as string | null;
    const subfolder = formData.get('subfolder') as string | undefined;

    if (!file || !category || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, category, userId' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, PDF` },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum allowed size is 10MB.' },
        { status: 400 }
      );
    }

    const url = await uploadToR2(file, category, userId, subfolder);

    return NextResponse.json({ url, success: true });
  } catch (error: any) {
    console.error('R2 upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

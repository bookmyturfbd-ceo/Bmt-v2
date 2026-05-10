import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is 1 MB (uploaded: ${(file.size / 1024).toFixed(0)} KB).` },
        { status: 413 }
      );
    }

    const ext = file.name.split('.').pop() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from('tournament-logos')
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('tournament-logos')
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

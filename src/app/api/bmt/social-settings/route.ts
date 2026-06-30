import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const keys = ['social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube'];
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: keys } },
    });
    
    const result: Record<string, string> = {
      social_facebook: '',
      social_instagram: '',
      social_tiktok: '',
      social_youtube: '',
    };
    
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('SocialSettings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch social settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keys = ['social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube'];
    
    const updates = [];
    for (const key of keys) {
      if (body[key] !== undefined) {
        updates.push(
          prisma.platformSetting.upsert({
            where: { key },
            create: { key, value: String(body[key]) },
            update: { value: String(body[key]) },
          })
        );
      }
    }
    
    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SocialSettings POST error:', error);
    return NextResponse.json({ error: 'Failed to update social settings' }, { status: 500 });
  }
}

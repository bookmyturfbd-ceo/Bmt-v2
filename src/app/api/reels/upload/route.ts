import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import Mux from '@mux/mux-node';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const pid = cookieStore.get('bmt_player_id')?.value;
    if (!pid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { caption } = body;

    // Check monthly limit (max 5 per month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const count = await prisma.reel.count({
      where: { 
        playerId: pid, 
        createdAt: { gte: startOfMonth } 
      }
    });

    if (count >= 5) {
      return NextResponse.json({ 
        error: 'You have reached your limit of 5 reels this month. Try again next month!' 
      }, { status: 429 });
    }

    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      // Mock mode if keys aren't set yet
      const mockId = `mock_upload_${Date.now()}`;
      await prisma.reel.create({
        data: { playerId: pid, muxUploadId: mockId, caption, status: 'uploading' }
      });
      return NextResponse.json({ uploadUrl: 'mock_url', id: mockId });
    }

    const mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET
    });

    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        video_quality: 'basic', // Cost optimization
      },
      cors_origin: '*'
    });

    await prisma.reel.create({
      data: {
        playerId: pid,
        muxUploadId: upload.id,
        caption,
        status: 'uploading'
      }
    });

    return NextResponse.json({ uploadUrl: upload.url, id: upload.id });
  } catch (error: any) {
    console.error("Mux Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

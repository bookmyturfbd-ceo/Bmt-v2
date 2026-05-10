import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Mux from '@mux/mux-node';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uploadId = searchParams.get('uploadId');
  
  if (!uploadId) {
    return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });
  }

  if (!process.env.MUX_TOKEN_ID) {
    // Mock mode
    await prisma.reel.update({
      where: { muxUploadId: uploadId },
      data: { 
        status: 'ready', 
        muxAssetId: `mock_asset_${Date.now()}`, 
        muxPlaybackId: `mock_playback_${Date.now()}` 
      }
    });
    return NextResponse.json({ status: 'ready' });
  }

  try {
    const mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET
    });

    const upload = await mux.video.uploads.retrieve(uploadId);
    
    if (upload.status === 'asset_created' && upload.asset_id) {
      const asset = await mux.video.assets.retrieve(upload.asset_id);
      
      if (asset.status === 'ready' && asset.playback_ids && asset.playback_ids.length > 0) {
        await prisma.reel.update({
          where: { muxUploadId: uploadId },
          data: {
            status: 'ready',
            muxAssetId: asset.id,
            muxPlaybackId: asset.playback_ids[0].id
          }
        });
        return NextResponse.json({ status: 'ready' });
      } else if (asset.status === 'errored') {
        await prisma.reel.update({
          where: { muxUploadId: uploadId },
          data: { status: 'error' }
        });
        return NextResponse.json({ status: 'error' });
      }
    }
    
    return NextResponse.json({ status: 'processing' });
  } catch (error: any) {
    console.error("Mux Status Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

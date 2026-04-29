import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import Mux from '@mux/mux-node';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const pid = cookieStore.get('bmt_player_id')?.value;
    if (!pid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reel = await prisma.reel.findUnique({ where: { id } });
    if (!reel || reel.playerId !== pid) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // Try to delete from Mux if asset exists
    if (process.env.MUX_TOKEN_ID && reel.muxAssetId) {
      const mux = new Mux({ 
        tokenId: process.env.MUX_TOKEN_ID, 
        tokenSecret: process.env.MUX_TOKEN_SECRET 
      });
      try { 
        await mux.video.assets.delete(reel.muxAssetId); 
      } catch (e) { 
        console.error('Mux delete error (maybe already deleted):', e); 
      }
    }

    await prisma.reel.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

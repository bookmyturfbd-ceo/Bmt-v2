import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const sponsors = await prisma.sponsor.findMany({ orderBy: { order: 'asc' } });
    let settings = await prisma.sponsorSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
      settings = await prisma.sponsorSettings.create({
        data: { id: 'singleton', autoSlide: true, intervalMs: 3500 }
      });
    }
    return NextResponse.json({ sponsors, settings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sponsors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, ctaLink, ctaText, order } = await req.json();
    const sponsor = await prisma.sponsor.create({
      data: { imageUrl, ctaLink, ctaText, order: order || 0 }
    });
    return NextResponse.json(sponsor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create sponsor' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.type === 'settings') {
      const settings = await prisma.sponsorSettings.update({
        where: { id: 'singleton' },
        data: { autoSlide: body.autoSlide, intervalMs: body.intervalMs }
      });
      return NextResponse.json(settings);
    } else {
      const { id, active, ctaLink, ctaText } = body;
      const sponsor = await prisma.sponsor.update({
        where: { id },
        data: {
          ...(active !== undefined && { active }),
          ...(ctaLink !== undefined && { ctaLink }),
          ...(ctaText !== undefined && { ctaText })
        }
      });
      return NextResponse.json(sponsor);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.sponsor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete sponsor' }, { status: 500 });
  }
}

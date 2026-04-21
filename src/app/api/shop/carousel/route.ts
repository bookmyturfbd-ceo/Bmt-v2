import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/shop/carousel — returns slides + settings
export async function GET() {
  const [slides, settings] = await Promise.all([
    prisma.shopCarouselSlide.findMany({ orderBy: { order: 'asc' } }),
    prisma.shopCarouselSettings.findFirst(),
  ]);
  return NextResponse.json({
    slides,
    settings: settings ?? { autoSlide: true, intervalMs: 3500, slideType: 'auto' },
  });
}

// POST — add a new slide
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imageUrl, ctaText, ctaLink, order } = body;
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });

  const slide = await prisma.shopCarouselSlide.create({
    data: { imageUrl, ctaText: ctaText || null, ctaLink: ctaLink || null, order: order ?? 0 },
  });
  return NextResponse.json(slide);
}

// PATCH — toggle active / update CTA / save settings
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (body.type === 'settings') {
    const settings = await prisma.shopCarouselSettings.upsert({
      where: { id: 'singleton' },
      update: {
        autoSlide: body.autoSlide ?? true,
        intervalMs: body.intervalMs ?? 3500,
        slideType: body.slideType ?? 'auto',
      },
      create: {
        id: 'singleton',
        autoSlide: body.autoSlide ?? true,
        intervalMs: body.intervalMs ?? 3500,
        slideType: body.slideType ?? 'auto',
      },
    });
    return NextResponse.json(settings);
  }

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updated = await prisma.shopCarouselSlide.update({
    where: { id: body.id },
    data: {
      ...(body.active !== undefined && { active: body.active }),
      ...(body.ctaText !== undefined && { ctaText: body.ctaText }),
      ...(body.ctaLink !== undefined && { ctaLink: body.ctaLink }),
    },
  });
  return NextResponse.json(updated);
}

// DELETE — remove a slide
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.shopCarouselSlide.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

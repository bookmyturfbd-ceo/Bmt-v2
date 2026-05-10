import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET — active slides ordered, plus carousel settings
export async function GET() {
  const [slides, settings] = await Promise.all([
    prisma.bannerSlide.findMany({ orderBy: { order: 'asc' } }),
    prisma.carouselSettings.findUnique({ where: { id: 'singleton' } }),
  ]);
  return NextResponse.json({
    slides,
    settings: settings ?? { id: 'singleton', autoSlide: true, intervalMs: 3500 },
  });
}

// POST — create a new slide
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imageUrl, ctaText, ctaLink, order, active } = body;
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });

  const slide = await prisma.bannerSlide.create({
    data: { imageUrl, ctaText: ctaText || null, ctaLink: ctaLink || null, order: order ?? 0, active: active ?? true },
  });
  return NextResponse.json(slide, { status: 201 });
}

// PATCH — upsert carousel settings or update a slide
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // Settings update
  if (body.type === 'settings') {
    const settings = await prisma.carouselSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', autoSlide: body.autoSlide ?? true, intervalMs: body.intervalMs ?? 3500 },
      update: { autoSlide: body.autoSlide ?? true, intervalMs: body.intervalMs ?? 3500 },
    });
    return NextResponse.json(settings);
  }

  // Slide update
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const slide = await prisma.bannerSlide.update({ where: { id }, data });
  return NextResponse.json(slide);
}

// DELETE — delete a slide by id
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.bannerSlide.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

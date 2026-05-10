import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const coupons = await prisma.wbtCoupon.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const { code, discountType, discountValue, maxUses, expiresAt } = await req.json();
  if (!code?.trim() || !discountType || !discountValue)
    return NextResponse.json({ error: 'code, discountType, and discountValue are required' }, { status: 400 });
  const existing = await prisma.wbtCoupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (existing) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
  const coupon = await prisma.wbtCoupon.create({
    data: {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      maxUses: parseInt(maxUses) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return NextResponse.json({ coupon });
}

export async function PATCH(req: NextRequest) {
  const { id, active } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const coupon = await prisma.wbtCoupon.update({ where: { id }, data: { active } });
  return NextResponse.json({ coupon });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.wbtCoupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

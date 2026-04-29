import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const KEY = 'wbt_match_fee_taka';

export async function GET() {
  const row = await prisma.platformSetting.findUnique({ where: { key: KEY } });
  return NextResponse.json({ fee: row ? parseFloat(row.value) : 500 });
}

export async function PATCH(req: NextRequest) {
  const { fee } = await req.json();
  if (fee === undefined || isNaN(parseFloat(fee)))
    return NextResponse.json({ error: 'fee must be a number' }, { status: 400 });
  await prisma.platformSetting.upsert({
    where: { key: KEY },
    update: { value: String(parseFloat(fee)) },
    create: { key: KEY, value: String(parseFloat(fee)) },
  });
  return NextResponse.json({ ok: true, fee: parseFloat(fee) });
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET - check if owner has a finance password set
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ hasLock: false });

  const lock = await prisma.financeLock.findUnique({ where: { ownerId } });
  return NextResponse.json({ hasLock: !!lock });
}

// POST - verify or set password
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, ownerId } = body;

  if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });
  const lock = await prisma.financeLock.findUnique({ where: { ownerId } });

  if (action === 'verify') {
    if (!lock) return NextResponse.json({ ok: false, error: 'No lock set.' }, { status: 401 });
    const ok = await bcrypt.compare(body.password, lock.password);
    return NextResponse.json({ ok });
  }

  if (action === 'set') {
    if (body.password?.length < 4) return NextResponse.json({ error: 'Too short.' }, { status: 400 });
    const hashed = await bcrypt.hash(body.password, 10);
    await prisma.financeLock.upsert({
      where: { ownerId },
      update: { password: hashed },
      create: { ownerId, password: hashed }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'change') {
    if (!lock) return NextResponse.json({ error: 'No lock set.' }, { status: 400 });
    const valid = await bcrypt.compare(body.currentPassword, lock.password);
    if (!valid) return NextResponse.json({ error: 'Current password incorrect.' }, { status: 401 });
    if (body.newPassword?.length < 4) return NextResponse.json({ error: 'Too short.' }, { status: 400 });
    
    const hashed = await bcrypt.hash(body.newPassword, 10);
    await prisma.financeLock.update({ where: { ownerId }, data: { password: hashed } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'remove') {
    if (!lock) return NextResponse.json({ error: 'No lock set.' }, { status: 400 });
    const valid = await bcrypt.compare(body.password, lock.password);
    if (!valid) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    
    await prisma.financeLock.delete({ where: { ownerId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

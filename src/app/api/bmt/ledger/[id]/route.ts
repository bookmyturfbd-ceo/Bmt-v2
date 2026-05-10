import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const entry = await prisma.ledgerEntry.findUnique({ where: { id } });
  if (entry) return NextResponse.json(entry);

  const conclusion = await prisma.ledgerConclusion.findUnique({ where: { id } });
  if (conclusion) return NextResponse.json(conclusion);

  return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  
  // Exclude structural identifiers from arbitrary update
  const { id: _id, turfId: _tid, ownerId: _oid, turf, owner, ...patch } = body;

  if (patch.amount !== undefined) patch.amount = Number(patch.amount);
  if (patch.totalAppIncome !== undefined) patch.totalAppIncome = Number(patch.totalAppIncome);
  if (patch.totalWalkIn !== undefined) patch.totalWalkIn = Number(patch.totalWalkIn);
  if (patch.totalCost !== undefined) patch.totalCost = Number(patch.totalCost);
  if (patch.netProfit !== undefined) patch.netProfit = Number(patch.netProfit);

  // Try updating an entry first
  try {
    const updatedEntry = await prisma.ledgerEntry.update({ where: { id }, data: patch });
    return NextResponse.json(updatedEntry);
  } catch (err) {
    // If not found, try conclusion
    try {
      const updatedConclusion = await prisma.ledgerConclusion.update({ where: { id }, data: patch });
      return NextResponse.json(updatedConclusion);
    } catch (e2) {
      return NextResponse.json({ error: 'Entity not found or could not evaluate type' }, { status: 400 });
    }
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.ledgerEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    try {
      await prisma.ledgerConclusion.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }
  }
}

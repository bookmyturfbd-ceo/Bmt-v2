import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const turfId = searchParams.get('turfId');
  const month = searchParams.get('month'); // YYYY-MM
  
  const entriesFilter: any = {};
  if (turfId) entriesFilter.turfId = turfId;
  if (month) entriesFilter.month = month;

  const [entries, conclusions] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: entriesFilter, orderBy: { createdAt: 'desc' } }),
    prisma.ledgerConclusion.findMany({ where: entriesFilter, orderBy: { concludedAt: 'desc' } })
  ]);

  return NextResponse.json({ entries, conclusions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'addEntry') {
    const entry = await prisma.ledgerEntry.create({
      data: {
        turfId: body.turfId,
        ownerId: body.ownerId,
        month: body.month,
        type: body.type, // 'cost' | 'income'
        category: body.category, // 'staff' | 'facility' | 'walk-in' | 'other'
        description: body.description || '',
        amount: Number(body.amount || 0)
      }
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (action === 'concludeMonth') {
    // Unique constraint on [ownerId, month] will handle duplicates if we use upsert, 
    // but the original logic returns a 400 if it already exists. Let me enforce it:
    const existing = await prisma.ledgerConclusion.findUnique({
      where: {
        ownerId_month: {
          ownerId: body.ownerId,
          month: body.month
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Month already concluded.' }, { status: 400 });
    }

    const conclusion = await prisma.ledgerConclusion.create({
      data: {
        turfId: body.turfId,
        ownerId: body.ownerId,
        month: body.month,
        totalAppIncome: Number(body.totalAppIncome || 0),
        totalWalkIn: Number(body.totalWalkIn || 0),
        totalCost: Number(body.totalCost || 0),
        netProfit: Number(body.netProfit || 0)
      }
    });
    return NextResponse.json(conclusion, { status: 201 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  
  if (body.action === 'deleteEntry') {
    try {
      await prisma.ledgerEntry.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

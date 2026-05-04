import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const wallet = await prisma.organizerWallet.findUnique({
      where: { organizerId: id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50 // last 50 transactions
        }
      }
    });

    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: wallet });
  } catch (error: any) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, description } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400 });
    }

    const wallet = await prisma.organizerWallet.findUnique({ where: { organizerId: id } });
    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 });
    }

    // Top up transaction
    const [updatedWallet] = await prisma.$transaction([
      prisma.organizerWallet.update({
        where: { organizerId: id },
        data: {
          balance: { increment: amount },
          totalToppedUp: { increment: amount }
        }
      }),
      prisma.organizerWalletTransaction.create({
        data: {
          wallet:      { connect: { organizerId: id } },
          type:        'TOP_UP',
          amount,
          description: description || 'Wallet top up'
        }
      })
    ]);

    return NextResponse.json({ success: true, data: updatedWallet });
  } catch (error: any) {
    console.error('Error topping up wallet:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

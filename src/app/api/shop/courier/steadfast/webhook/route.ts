import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const { moveOrder } = require('../../../../../../../telegram-bot');

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerToken = process.env.STEADFAST_BEARER_TOKEN;

    // Validate request security if webhook bearer token is set
    if (bearerToken && authHeader !== `Bearer ${bearerToken}`) {
      console.warn('Steadfast Webhook Warning: Unauthorized request attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { consignment_id, invoice, status } = payload;

    if (!invoice && !consignment_id) {
      return NextResponse.json({ error: 'Invoice or consignment_id is required' }, { status: 400 });
    }

    // Attempt to locate the order in BMT
    let order = null;
    if (invoice) {
      order = await prisma.shopOrder.findUnique({
        where: { id: invoice },
      });
    }

    if (!order && consignment_id) {
      order = await prisma.shopOrder.findFirst({
        where: { steadfastConsignmentId: consignment_id.toString() },
      });
    }

    if (!order) {
      console.warn(`Steadfast Webhook Warning: Order not found for invoice: ${invoice}, consignment: ${consignment_id}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update the steadfast status in the database
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        steadfastStatus: status,
      },
    });

    // Map Steadfast courier status to BMT order status
    let newBmtStatus: string | null = null;
    const lowerStatus = status?.toLowerCase();

    if (lowerStatus === 'delivered') {
      newBmtStatus = 'delivered';
    } else if (lowerStatus === 'cancelled' || lowerStatus === 'canceled') {
      newBmtStatus = 'canceled';
    } else if (lowerStatus === 'returned') {
      newBmtStatus = 'returned';
    }

    // Transition BMT status if mapped and different
    if (newBmtStatus && order.status !== newBmtStatus) {
      await moveOrder(order.id, newBmtStatus, null);
      console.log(`Steadfast Webhook Success: Order #${order.id.slice(0, 8)} status updated to ${newBmtStatus}`);
    } else {
      console.log(`Steadfast Webhook Success: Order #${order.id.slice(0, 8)} steadfastStatus updated to ${status}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Steadfast Webhook Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

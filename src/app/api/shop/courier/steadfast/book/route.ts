import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const { moveOrder } = require('../../../../../../../telegram-bot');

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.steadfastConsignmentId) {
      return NextResponse.json({
        error: 'Order is already booked with Steadfast',
        consignmentId: order.steadfastConsignmentId,
        trackingCode: order.steadfastTrackingCode
      }, { status: 400 });
    }

    // Normalize phone number (must be 11 digits)
    let cleanPhone = order.customerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('880')) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith('80') && cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('88') && cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(2);
    }
    
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
    }

    if (cleanPhone.length !== 11) {
      return NextResponse.json({
        error: `Invalid phone number for courier: ${order.customerPhone}. Must be 11 digits.`
      }, { status: 400 });
    }

    // Determine COD amount (0 if paid via wallet)
    const codAmount = order.paymentMethod === 'wallet' ? 0 : order.total;

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.steadfast.com.bd/api/v1';

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: 'Steadfast credentials are not configured' }, { status: 500 });
    }

    // Steadfast Order Payload
    const payload = {
      invoice: order.id,
      recipient_name: order.customerName,
      recipient_phone: cleanPhone,
      recipient_address: `${order.address}, ${order.district}`,
      cod_amount: codAmount,
      note: order.notes || 'BMT Shop order'
    };

    const response = await fetch(`${baseUrl}/create_order`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Steadfast API returned error status: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check Steadfast API specific status
    if (data.status !== 200 || !data.consignment) {
      return NextResponse.json({
        error: data.message || 'Failed to create order on Steadfast',
        details: data
      }, { status: 400 });
    }

    const consignment = data.consignment;

    // Update database with consignment details
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        steadfastConsignmentId: consignment.consignment_id.toString(),
        steadfastTrackingCode: consignment.tracking_code,
        steadfastStatus: consignment.status,
      }
    });

    // Move order to "on_the_way" status (Telegram notification + status update)
    await moveOrder(order.id, 'on_the_way', null);

    return NextResponse.json({
      success: true,
      consignmentId: consignment.consignment_id,
      trackingCode: consignment.tracking_code,
      status: consignment.status
    });

  } catch (error: any) {
    console.error('Steadfast Booking Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

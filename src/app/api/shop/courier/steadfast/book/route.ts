import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const { moveOrder } = require('../../../../../../../telegram-bot');

export async function POST(req: NextRequest) {
  try {
    const { 
      orderId, 
      recipientName, 
      recipientPhone, 
      recipientAddress, 
      codAmount, 
      note 
    } = await req.json();

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
    const rawPhone = recipientPhone || order.customerPhone;
    let cleanPhone = rawPhone.replace(/\D/g, '');
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
        error: `Invalid phone number for courier: ${rawPhone}. Must be 11 digits.`
      }, { status: 400 });
    }

    // Determine COD amount (use custom if provided, else 0 for wallet, else order total)
    const finalCodAmount = codAmount !== undefined ? Number(codAmount) : (order.paymentMethod === 'wallet' ? 0 : order.total);
    const finalName = recipientName || order.customerName;
    const finalAddress = recipientAddress || `${order.address}, ${order.district}`;
    const finalNote = note !== undefined ? note : (order.notes || 'BMT Shop order');

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1';

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: 'Steadfast credentials are not configured' }, { status: 500 });
    }

    // Steadfast Order Payload
    const payload = {
      invoice: order.id,
      recipient_name: finalName,
      recipient_phone: cleanPhone,
      recipient_address: finalAddress,
      cod_amount: finalCodAmount,
      note: finalNote
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
      const errorMessage = errorText ? errorText.replace(/"/g, '') : response.statusText;
      return NextResponse.json(
        { error: `Steadfast API Error: ${errorMessage}`, details: errorText },
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

    // Update database with consignment details and copy custom recipient inputs
    await prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        steadfastConsignmentId: consignment.consignment_id.toString(),
        steadfastTrackingCode: consignment.tracking_code,
        steadfastStatus: consignment.status,
        customerName: finalName,
        customerPhone: rawPhone,
        address: recipientAddress ? recipientAddress.replace(`, ${order.district}`, '').trim() : order.address,
        notes: finalNote
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

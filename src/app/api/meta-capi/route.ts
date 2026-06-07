import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Standard SHA-256 helper for Meta Conversions API hashing requirement
function hashValue(val: any): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim().toLowerCase();
  if (!str) return null;
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Phone normalization helper matching client-side logic
function normalizePhone(phone: any): string | null {
  if (phone === undefined || phone === null) return null;
  const digits = String(phone).replace(/\D/g, ''); // keep digits only
  if (digits.startsWith('0')) {
    return '880' + digits.slice(1);
  }
  return digits;
}

// Email normalization helper matching client-side logic
function normalizeEmail(email: any): string | null {
  if (email === undefined || email === null) return null;
  return String(email).trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
    const testEventCode = process.env.META_TEST_EVENT_CODE;

    if (!pixelId || !accessToken) {
      // Return 200 with notice to avoid console error loops on the client side
      return NextResponse.json({ 
        success: false, 
        message: 'Meta credentials are not configured in environment variables.' 
      });
    }

    const body = await req.json();
    const { eventName, eventId, eventSourceUrl, customData, userData = {} } = body;

    // Resolve accurate client IP address
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';
                
    // Resolve client User-Agent
    const userAgent = req.headers.get('user-agent') || '';

    // Retrieve fbp, fbc, and bmt_external_id cookies from request headers
    const cookieFbp = req.cookies.get('_fbp')?.value;
    const cookieFbc = req.cookies.get('_fbc')?.value;
    const cookieExtId = req.cookies.get('bmt_external_id')?.value;
    
    const fbp = userData.fbp || cookieFbp || '';
    const fbc = userData.fbc || cookieFbc || '';
    const externalId = cookieExtId || userData.externalId || '';

    const metaUserData: any = {
      client_ip_address: ip,
      client_user_agent: userAgent,
    };

    if (fbp) metaUserData.fbp = fbp;
    if (fbc) metaUserData.fbc = fbc;
    
    // Send external_id RAW (do NOT hash it, per Meta schema/specs)
    if (externalId) {
      metaUserData.external_id = [externalId];
    }

    // Attach email and phone ONLY to Purchase, InitiateCheckout, and Lead events
    const allowContactInfo = ['Purchase', 'InitiateCheckout', 'Lead'].includes(eventName);
    if (allowContactInfo) {
      if (userData.email) {
        const normEmail = normalizeEmail(userData.email);
        const emailHash = hashValue(normEmail);
        if (emailHash) metaUserData.em = [emailHash];
      }
      if (userData.phone) {
        const normPhone = normalizePhone(userData.phone);
        const phoneHash = hashValue(normPhone);
        if (phoneHash) metaUserData.ph = [phoneHash];
      }

      // Add name properties if provided
      if (userData.firstName) {
        const firstNameHash = hashValue(userData.firstName);
        if (firstNameHash) metaUserData.fn = [firstNameHash];
      } else if (userData.name) {
        const firstNameHash = hashValue(userData.name.split(' ')[0]);
        if (firstNameHash) metaUserData.fn = [firstNameHash];
      }

      if (userData.lastName) {
        const lastNameHash = hashValue(userData.lastName);
        if (lastNameHash) metaUserData.ln = [lastNameHash];
      } else if (userData.name) {
        const lastNameHash = hashValue(userData.name.split(' ').slice(1).join(' '));
        if (lastNameHash) metaUserData.ln = [lastNameHash];
      }
    }

    // Build standard payload format for Meta Events endpoint
    const metaPayload: any = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: eventSourceUrl || '',
          action_source: 'website',
          user_data: metaUserData,
          custom_data: customData || {},
        }
      ]
    };

    // If meta test event code is configured, add it for active testing in Facebook Events Manager
    if (testEventCode) {
      metaPayload.test_event_code = testEventCode;
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    const resJson = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI API error response:', resJson);
      return NextResponse.json({ success: false, error: resJson.error }, { status: response.status });
    }

    return NextResponse.json({ success: true, data: resJson });
  } catch (error: any) {
    console.error('Meta CAPI route exception:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

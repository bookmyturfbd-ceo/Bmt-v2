import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Standard SHA-256 helper for Meta Conversions API hashing requirement
function hashValue(val: any): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim().toLowerCase();
  if (!str) return null;
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Phone cleaning helper: keep digits only and normalize Bangladesh prefix
function cleanPhone(phone: any): string | null {
  if (phone === undefined || phone === null) return null;
  let str = String(phone).replace(/\D/g, ''); // keep digits only
  // If it starts with 01 (11 digits, typical Bangladeshi mobile), prepend 88 (country code)
  if (str.startsWith('01') && str.length === 11) {
    str = '88' + str;
  }
  return str;
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

    // Try to get fbp and fbc cookies
    const cookieFbp = req.cookies.get('_fbp')?.value;
    const cookieFbc = req.cookies.get('_fbc')?.value;
    
    const fbp = userData.fbp || cookieFbp || '';
    const fbc = userData.fbc || cookieFbc || '';

    // Clean and cryptographically hash user match identifiers
    const emailHash = hashValue(userData.email);
    const phoneCleaned = cleanPhone(userData.phone);
    const phoneHash = hashValue(phoneCleaned);
    const firstNameHash = hashValue(userData.firstName || userData.name?.split(' ')[0]);
    const lastNameHash = hashValue(userData.lastName || userData.name?.split(' ').slice(1).join(' '));

    const metaUserData: any = {
      client_ip_address: ip,
      client_user_agent: userAgent,
    };

    if (fbp) metaUserData.fbp = fbp;
    if (fbc) metaUserData.fbc = fbc;
    if (emailHash) metaUserData.em = [emailHash];
    if (phoneHash) metaUserData.ph = [phoneHash];
    if (firstNameHash) metaUserData.fn = [firstNameHash];
    if (lastNameHash) metaUserData.ln = [lastNameHash];

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

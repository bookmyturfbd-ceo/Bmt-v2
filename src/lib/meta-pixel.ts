'use client';

/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: any): string {
  return String(email || '').trim().toLowerCase();
}

/**
 * Normalizes phone number: removes all non-digit characters.
 * If the number starts with '0', replaces the leading '0' with '880'.
 * Otherwise leaves it as is.
 */
export function normalizePhone(phone: any): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '880' + digits.slice(1);
  }
  return digits;
}

/**
 * Tracks an event via client-side Meta Pixel and server-side Conversions API (CAPI).
 * Deduplicates the events using a matching eventId.
 * 
 * @param eventName The standard Meta event name (e.g., PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Lead)
 * @param customData Optional parameter values like content_name, contents, value, currency, etc.
 * @param userData Optional match parameters like name, email, phone, etc.
 */
export const trackMetaEvent = async (
  eventName: string,
  customData: any = {},
  userData: any = {},
  eventIdOverride?: string
) => {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return;

  // 1. Resolve or Generate persistent external_id cookie
  let externalId = '';
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split('; ');
    const extCookie = cookies.find(row => row.startsWith('bmt_external_id='));
    if (extCookie) {
      externalId = extCookie.split('=')[1];
    } else {
      try {
        // Use crypto.randomUUID() as requested with compliant UUID v4 fallback
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          externalId = crypto.randomUUID();
        } else {
          externalId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 365);
        document.cookie = `bmt_external_id=${externalId}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;
      } catch (e) {
        console.warn('Failed to generate bmt_external_id:', e);
      }
    }
  }

  // Use the custom event ID if provided, otherwise generate a unique one
  const eventId = eventIdOverride || `${eventName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Assemble Pixel Advanced Matching parameters
  const advancedMatching: any = {};
  if (externalId) {
    advancedMatching.external_id = externalId;
  }

  // Attach email and phone ONLY to Purchase, InitiateCheckout, and Lead events
  const allowContactInfo = ['Purchase', 'InitiateCheckout', 'Lead'].includes(eventName);
  if (allowContactInfo) {
    if (userData.email) {
      advancedMatching.em = normalizeEmail(userData.email);
    }
    if (userData.phone) {
      advancedMatching.ph = normalizePhone(userData.phone);
    }
  }

  // 2. Client-Side tracking (Meta Pixel)
  if (typeof window !== 'undefined' && (window as any).fbq) {
    try {
      // Re-initialize dynamic advanced matching before tracking the event
      if (Object.keys(advancedMatching).length > 0) {
        (window as any).fbq('init', pixelId, advancedMatching);
      }
      (window as any).fbq('track', eventName, customData, { eventID: eventId });
    } catch (err) {
      console.warn('Meta Pixel tracking error:', err);
    }
  }

  // 3. Server-Side tracking (Conversions API)
  try {
    let fbp = '';
    let fbc = '';
    
    if (typeof document !== 'undefined') {
      fbp = document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1] || '';
      fbc = document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1] || '';
    }

    const capiUserData: any = {
      fbp,
      fbc,
      externalId, // raw UUID
    };

    if (allowContactInfo) {
      if (userData.email) {
        capiUserData.email = normalizeEmail(userData.email);
      }
      if (userData.phone) {
        capiUserData.phone = normalizePhone(userData.phone);
      }
      if (userData.name) {
        capiUserData.name = userData.name;
      }
      if (userData.firstName) {
        capiUserData.firstName = userData.firstName;
      }
      if (userData.lastName) {
        capiUserData.lastName = userData.lastName;
      }
    }

    await fetch('/api/meta-capi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
        customData,
        userData: capiUserData,
      }),
    });
  } catch (err) {
    console.warn('Meta CAPI tracking call failed:', err);
  }
};

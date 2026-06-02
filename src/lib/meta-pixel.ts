'use client';

/**
 * Tracks an eCommerce event via client-side Meta Pixel and server-side Conversions API (CAPI).
 * Deduplicates the events using a matching eventId.
 * 
 * @param eventName The standard Meta event name (e.g., PageView, ViewContent, AddToCart, InitiateCheckout, Purchase)
 * @param customData Optional parameter values like content_name, contents, value, currency, etc.
 * @param userData Optional match parameters like name, email, phone, etc. (will be hashed server-side)
 */
export const trackMetaEvent = async (
  eventName: string,
  customData: any = {},
  userData: any = {}
) => {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return;

  // Generate a unique event ID for deduplication
  const eventId = `${eventName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // 1. Client-Side tracking (Meta Pixel)
  if (typeof window !== 'undefined' && (window as any).fbq) {
    try {
      (window as any).fbq('track', eventName, customData, { eventID: eventId });
    } catch (err) {
      console.warn('Meta Pixel tracking error:', err);
    }
  }

  // 2. Server-Side tracking (Conversions API)
  try {
    let fbp = '';
    let fbc = '';
    
    if (typeof document !== 'undefined') {
      fbp = document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1] || '';
      fbc = document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1] || '';
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
        userData: {
          ...userData,
          fbp,
          fbc,
        },
      }),
    });
  } catch (err) {
    console.warn('Meta CAPI tracking call failed:', err);
  }
};

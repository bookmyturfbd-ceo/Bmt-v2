export interface AttributionData {
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  _fbp?: string;
  _fbc?: string;
  landing_path: string;
  captured_at: string;
}

export function captureAttribution() {
  if (typeof window === 'undefined') return;

  const paramsToTrack = [
    'fbclid',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    '_fbp',
    '_fbc'
  ];

  const searchParams = new URLSearchParams(window.location.search);
  const presentParams: Record<string, string> = {};
  let hasAnyParam = false;

  paramsToTrack.forEach(param => {
    const val = searchParams.get(param);
    if (val) {
      presentParams[param] = val;
      hasAnyParam = true;
    }
  });

  if (hasAnyParam) {
    const landingPath = window.location.pathname;
    const capturedAt = new Date().toISOString();

    const trackingPayload: AttributionData = {
      ...presentParams,
      landing_path: landingPath,
      captured_at: capturedAt
    };

    // First touch: write only if not already set (first touch wins)
    const existingFirstTouch = localStorage.getItem('bmt_first_touch');
    if (!existingFirstTouch) {
      localStorage.setItem('bmt_first_touch', JSON.stringify(trackingPayload));
    }

    // Last touch: overwrite on every visit where ad params are present
    localStorage.setItem('bmt_last_touch', JSON.stringify(trackingPayload));
  }
}

export function getAttribution() {
  if (typeof window === 'undefined') {
    return { first_touch: null, last_touch: null };
  }

  const firstTouchStr = localStorage.getItem('bmt_first_touch');
  const lastTouchStr = localStorage.getItem('bmt_last_touch');

  let first_touch: AttributionData | null = null;
  let last_touch: AttributionData | null = null;

  try {
    if (firstTouchStr) first_touch = JSON.parse(firstTouchStr);
  } catch (e) {
    console.error('Failed to parse bmt_first_touch', e);
  }

  try {
    if (lastTouchStr) last_touch = JSON.parse(lastTouchStr);
  } catch (e) {
    console.error('Failed to parse bmt_last_touch', e);
  }

  return { first_touch, last_touch };
}

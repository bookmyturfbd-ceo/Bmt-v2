'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackMetaEvent } from '@/lib/meta-pixel';
import { captureAttribution } from '@/lib/tracking';

function TrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Capture attribution parameters from URL
    captureAttribution();

    // Automatically track standard PageView event when routing pathname or query search params change
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (pixelId) {
      trackMetaEvent('PageView');
    }
  }, [pathname, searchParams]);

  return null;
}

export default function MetaTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerContent />
    </Suspense>
  );
}

'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackMetaEvent } from '@/lib/meta-pixel';

function TrackerContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Automatically track standard PageView event when routing pathname or query search params change
    trackMetaEvent('PageView');
  }, [pathname, searchParams]);

  return null;
}

export default function MetaTracker() {
  // Check if pixel ID configuration exists
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  return (
    <Suspense fallback={null}>
      <TrackerContent />
    </Suspense>
  );
}

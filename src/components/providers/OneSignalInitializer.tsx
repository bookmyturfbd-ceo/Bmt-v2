'use client';

import { useEffect } from 'react';
import { initOneSignal } from '@/lib/onesignal';

export default function OneSignalInitializer() {
  useEffect(() => {
    initOneSignal();
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';
import { initOneSignal, getLoggedInUserId, triggerNotificationPrompt } from '@/lib/onesignal';
import SoftNotificationModal from '@/components/layout/SoftNotificationModal';

export default function OneSignalInitializer() {
  useEffect(() => {
    initOneSignal();
  }, []);

  useEffect(() => {
    // Wait for the app shell to render
    const timer = setTimeout(() => {
      if (typeof window === 'undefined') return;

      const languageSelected = localStorage.getItem('bmt_language_selected') === 'true';
      const isLanguageModalOpen = !localStorage.getItem('bmt_language_selected');
      const userId = getLoggedInUserId();

      if (userId && languageSelected && !isLanguageModalOpen) {
        // Trigger the soft prompt modal if they just logged in / first session
        const hasTriggeredFirstLoad = localStorage.getItem('bmt_onesignal_first_load_triggered');
        if (!hasTriggeredFirstLoad) {
          localStorage.setItem('bmt_onesignal_first_load_triggered', 'true');
          triggerNotificationPrompt();
        }
      }
    }, 2000); // 2 second delay to let everything load and render

    return () => clearTimeout(timer);
  }, []);

  return <SoftNotificationModal />;
}

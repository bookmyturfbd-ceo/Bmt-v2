'use client';
import { useEffect } from 'react';
import { registerPushNotifications } from '@/lib/capacitor';

/**
 * Initializes mobile native bridge operations on startup.
 * Triggers the native Push Notifications permission prompt and registers the token.
 */
export default function MobileBridgeInitializer() {
  useEffect(() => {
    registerPushNotifications(
      (token) => {
        // You will see this token logged in Android Studio's Logcat console!
        console.log('FCM Device Push Token:', token);
      },
      (notification) => {
        console.log('FCM Foreground Notification Received:', notification);
      }
    );
  }, []);

  return null;
}

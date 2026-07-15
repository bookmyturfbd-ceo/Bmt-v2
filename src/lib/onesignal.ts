'use client';

import OneSignal from 'react-onesignal';
import { getCookie } from '@/lib/cookies';
import { isNativePlatform } from '@/lib/capacitor';

/**
 * Retrieves the currently logged-in user ID across all roles (Player, Owner/Coach, Organizer).
 */
export function getLoggedInUserId(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check Player role
  const playerId = getCookie('bmt_player_id');
  if (playerId) return playerId;

  // 2. Check Owner / Coach role
  const ownerId = getCookie('bmt_owner_id');
  if (ownerId) return ownerId;

  // 3. Check Organizer role (parse JWT payload without external library)
  const orgToken = getCookie('org_token');
  if (orgToken) {
    try {
      const parts = orgToken.split('.');
      if (parts[0]) {
        const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        return payload.id || null;
      }
    } catch (e) {
      console.error('OneSignal: Failed to parse organizer token cookie:', e);
    }
  }

  return null;
}

/**
 * Links the logged-in user's identity to the OneSignal session.
 * If user is logged out, calls OneSignal.logout() to unlink device context.
 */
export async function syncOneSignalIdentity(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const userId = getLoggedInUserId();
    if (userId) {
      console.log(`OneSignal: Authenticating session with external ID: ${userId}`);
      await OneSignal.login(userId);
    } else {
      console.log('OneSignal: No active user session. Logging out OneSignal session.');
      await OneSignal.logout();
    }
  } catch (err) {
    console.error('OneSignal: Failed to sync identity:', err);
  }
}

/**
 * Initializes the OneSignal Web SDK client-side.
 */
export async function initOneSignal(): Promise<void> {
  if (typeof window === 'undefined') return;

  // OneSignal Web SDK should only initialize on non-native platform (Web/PWA)
  if (isNativePlatform()) {
    console.log('OneSignal: Native mobile platform detected. Skipping Web SDK initialization.');
    return;
  }

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('OneSignal: NEXT_PUBLIC_ONESIGNAL_APP_ID is not configured.');
    return;
  }

  try {
    console.log('OneSignal: Initializing Web SDK...');
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: 'sw.js',
    });

    console.log('OneSignal: Web SDK initialized successfully.');

    // Link identity immediately if logged in
    await syncOneSignalIdentity();

    // Listen to push subscription updates (e.g. user subscribes, unsubscribes, gets a token)
    OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
      console.log('OneSignal: Push subscription state changed. Opted-in:', event.current.optedIn);
      if (event.current.optedIn) {
        await syncOneSignalIdentity();
      }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // "App not configured for web push" is expected on localhost — origin won't match the
    // production domain registered in the OneSignal dashboard. Suppress it in dev.
    if (msg.toLowerCase().includes('not configured') && window.location.hostname === 'localhost') {
      console.log('OneSignal: Skipping on localhost (origin mismatch with production config — expected).');
    } else {
      console.error('OneSignal: Initialization failed:', err);
    }
  }
}

/**
 * Programmatically triggers the browser's native notification permission prompt.
 * Recommended to be called after high-intent user actions (e.g., booking slots, sending challenges).
 */
let shownThisSession = false;

export async function triggerNotificationPrompt(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Never show if permission is already granted or denied
  if ('Notification' in window && Notification.permission !== 'default') {
    return;
  }

  // 2. Cooldown check (3 days)
  const cooldownKey = 'bmt_onesignal_cooldown';
  const cooldownVal = localStorage.getItem(cooldownKey);
  if (cooldownVal) {
    const elapsed = Date.now() - parseInt(cooldownVal, 10);
    if (elapsed < 3 * 24 * 60 * 60 * 1000) {
      return;
    }
  }

  // 3. Max once per session
  if (shownThisSession) {
    return;
  }

  shownThisSession = true;

  try {
    // Dynamically import to avoid any SSR/circular dependency issues
    const { useNotificationsStore } = await import('@/hooks/useNotificationsStore');
    useNotificationsStore.getState().openModal('trigger');
  } catch (err) {
    console.error('OneSignal: Failed to open soft permission modal:', err);
  }
}

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';

/**
 * Checks if the application is running in a native mobile environment (iOS or Android)
 */
export const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

/**
 * Interface representing a coordinates object
 */
export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Safely requests geolocation of the device.
 * Automatically falls back to standard browser Geolocation API if not running natively.
 */
export const getDeviceLocation = async (): Promise<DeviceCoordinates> => {
  if (typeof window === 'undefined') {
    throw new Error('Geolocation is client-side only.');
  }

  if (isNativePlatform()) {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          throw new Error('Location permission denied on mobile device');
        }
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (error) {
      console.warn('Capacitor native location failed, attempting browser location fallback...', error);
    }
  }

  // Fallback to browser HTML5 Location API
  return new Promise<DeviceCoordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(`Browser geolocation failed: ${error.message}`));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

/**
 * Safely requests to take a photo using the native camera.
 * Returns a base64 string representation of the image or standard data URI.
 */
export const capturePhoto = async (): Promise<{ base64String?: string; webPath?: string }> => {
  if (typeof window === 'undefined') {
    throw new Error('Camera is client-side only.');
  }

  if (isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera, // Direct to native camera view
    });
    return {
      base64String: photo.base64String,
      webPath: photo.webPath,
    };
  }

  throw new Error('Native camera is only supported inside the native Android/iOS application wrapper. Please use standard file upload on the web.');
};

/**
 * Safely registers the device for push notifications.
 * Automatically checks and requests permission on native platforms, returning the token string.
 */
export const registerPushNotifications = async (
  onTokenReceived: (token: string) => void,
  onNotificationReceived?: (notification: any) => void
): Promise<void> => {
  if (!isNativePlatform()) {
    console.log('Capacitor native push notifications are ignored on non-native platform (Web). OneSignal handles Web Push.');
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notifications permission');
      return;
    }

    // Register with Apple / Google push services
    await PushNotifications.register();

    // Listeners
    await PushNotifications.addListener('registration', (token) => {
      console.log('Native Push Registration Token:', token.value);
      onTokenReceived(token.value);
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Native Push Registration Error:', error.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });
  } catch (error) {
    console.error('Push notification registration failed', error);
  }
};

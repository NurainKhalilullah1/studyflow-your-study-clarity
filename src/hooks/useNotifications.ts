import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { getFirebaseMessaging } from '@/lib/firebase';
import { toast } from 'sonner';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

type PermissionStatus = 'default' | 'granted' | 'denied' | 'loading';

export function useNotifications(userId: string | undefined) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('default');
  const isNative = Capacitor.isNativePlatform();

  // Guard: ensures we only set up native listeners once per session
  const androidRegistered = useRef(false);

  // Save the FCM/push token to Supabase
  const saveToken = useCallback(async (token: string, platform: 'web' | 'android' | 'ios') => {
    if (!userId) return;
    try {
      await supabase.from('push_tokens').upsert(
        { user_id: userId, token, platform, last_seen: new Date().toISOString() },
        { onConflict: 'token' }
      );
    } catch (err) {
      console.error('Failed to save push token (non-fatal):', err);
    }
  }, [userId]);

  // ── Web push registration ──────────────────────────────────────────────────
  const registerWeb = useCallback(async () => {
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        console.warn('Firebase Messaging not supported in this browser');
        return;
      }
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (token) {
        await saveToken(token, 'web');
        setPermissionStatus('granted');
      }
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'StudyFlow';
        const body = payload.notification?.body || '';
        toast(title, { description: body, duration: 6000 });
      });
    } catch (err: any) {
      console.error('Web push registration failed:', err);
      if (err?.code === 'messaging/permission-blocked') {
        setPermissionStatus('denied');
      }
    }
  }, [saveToken]);

  // ── Android native push registration ──────────────────────────────────────
  // Sets up listeners ONCE and registers with FCM.
  // Always clears existing listeners first to prevent stacking.
  const setupAndroidListeners = useCallback(async (currentUserId: string) => {
    if (androidRegistered.current) return; // already set up this session
    androidRegistered.current = true;

    try {
      // Clear any stale listeners from a previous run
      await PushNotifications.removeAllListeners();

      // Listen for FCM registration error safely
      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('Push notification registration error (non-fatal):', err);
      });

      // Listen for FCM token — wrapped in try/catch to prevent WebView crash
      await PushNotifications.addListener('registration', async (tokenData) => {
        try {
          await supabase.from('push_tokens').upsert(
            { user_id: currentUserId, token: tokenData.value, platform: 'android', last_seen: new Date().toISOString() },
            { onConflict: 'token' }
          );
          setPermissionStatus('granted');
        } catch (err) {
          console.error('Token save failed (non-fatal):', err);
          setPermissionStatus('granted');
        }
      });

      // Handle foreground notifications
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        try {
          toast(notification.title || 'StudyFlow', {
            description: notification.body || '',
            duration: 6000,
          });
        } catch (_) {}
      });

      // Handle notification tap
      await PushNotifications.addListener('pushNotificationActionPerformed', () => {});

      // Trigger FCM registration (gets/refreshes the token)
      await PushNotifications.register();
    } catch (err) {
      console.error('Android listener setup failed:', err);
      androidRegistered.current = false; // allow retry
    }
  }, []); // no deps — uses currentUserId param instead to avoid re-runs

  // ── Request permission (called by the prompt UI) ──────────────────────────
  const requestPermission = useCallback(async () => {
    if (!userId) return;
    setPermissionStatus('loading');

    if (isNative) {
      try {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          setPermissionStatus('denied');
          return;
        }
        await setupAndroidListeners(userId);
      } catch (err) {
        console.error('Permission request failed:', err);
        setPermissionStatus('denied');
      }
    } else {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setPermissionStatus('denied');
        return;
      }
      if (Notification.permission === 'denied') {
        setPermissionStatus('denied');
        return;
      }
      await registerWeb();
    }
  }, [userId, isNative, registerWeb, setupAndroidListeners]);

  // ── Check existing permission on mount (once per userId) ─────────────────
  useEffect(() => {
    if (!userId) return;

    if (isNative) {
      try {
        PushNotifications.checkPermissions().then((result) => {
          if (result.receive === 'granted') {
            setPermissionStatus('granted');
            // Silently re-register to ensure token is saved (handles crash-on-first-grant)
            setupAndroidListeners(userId);
          }
        }).catch((err) => {
          console.warn('Check permissions error (non-fatal):', err);
        });
      } catch (err) {
        console.warn('PushNotifications checkPermissions error:', err);
      }
    } else {
      if ('Notification' in window) {
        const p = Notification.permission;
        if (p === 'granted') {
          setPermissionStatus('granted');
          registerWeb();
        } else if (p === 'denied') {
          setPermissionStatus('denied');
        }
      }
    }
  }, [userId]); // intentionally only userId — avoids re-running on callback identity changes

  return { permissionStatus, requestPermission };
}

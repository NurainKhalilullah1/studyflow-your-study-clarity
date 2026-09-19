/**
 * capacitorStorage.ts
 *
 * A Supabase-compatible storage adapter that uses @capacitor/preferences on
 * native platforms (Android / iOS) and falls back to localStorage on web.
 *
 * Why: Capacitor's WebView localStorage is scoped to the in-process web origin
 * (http://localhost) and can be cleared by the OS in low-memory situations.
 * @capacitor/preferences writes to native key-value storage (SharedPreferences
 * on Android, UserDefaults on iOS) which survives app restarts reliably.
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/** Supabase storage interface */
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

const webAdapter: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

const nativeAdapter: StorageAdapter = {
  getItem: async (key) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key, value) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    await Preferences.remove({ key });
  },
};

/**
 * Returns the right storage adapter for the current platform.
 * Use this as the `storage` option when creating the Supabase client.
 */
export const capacitorStorage: StorageAdapter = Capacitor.isNativePlatform()
  ? nativeAdapter
  : webAdapter;

'use client';

import { useEffect } from 'react';

export default function NativeInit() {
  useEffect(() => {
    async function requestNativePermissions() {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        await Geolocation.requestPermissions();
      } catch {
        // permission denied or unavailable — non-fatal
      }
    }

    requestNativePermissions();
  }, []);

  return null;
}

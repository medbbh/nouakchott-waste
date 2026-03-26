'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getVisitorId } from '@/lib/fingerprint';

interface FingerprintContextValue {
  visitorId: string | null;
}

const FingerprintContext = createContext<FingerprintContextValue>({ visitorId: null });

export function FingerprintProvider({ children }: { children: React.ReactNode }) {
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    getVisitorId().then(setVisitorId).catch(console.error);
  }, []);

  return (
    <FingerprintContext.Provider value={{ visitorId }}>
      {children}
    </FingerprintContext.Provider>
  );
}

export function useFingerprint() {
  return useContext(FingerprintContext);
}

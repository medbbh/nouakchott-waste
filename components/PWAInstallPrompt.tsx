'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, X, Share } from 'lucide-react';

const STORAGE_KEY = '0dechets_pwa_dismissed';
const DISMISS_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function isDismissed(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  return Date.now() - Number(raw) < DISMISS_TTL_MS;
}

type Platform = 'android' | 'ios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

function detectPlatform(): Platform | null {
  // Already running as installed PWA — don't show
  if (window.matchMedia('(display-mode: standalone)').matches) return null;
  // iOS standalone via navigator.standalone
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) return null;

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return null;
}

export default function PWAInstallPrompt() {
  const t = useTranslations('pwa');
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isDismissed()) return;

    const detected = detectPlatform();
    if (!detected) return;
    setPlatform(detected);

    if (detected === 'android') {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e as BeforeInstallPromptEvent;
        setTimeout(() => setVisible(true), 5000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }

    // iOS: just show the guide after a delay
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    if (outcome === 'accepted') dismiss();
  };

  if (!visible || !platform) return null;

  return (
    <div className="absolute bottom-24 left-3 right-3 z-40 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <Download size={15} className="text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-gray-900 text-sm">{t('title')}</span>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600 active:scale-90 transition-transform p-1"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <p className="px-4 pb-3 text-xs text-gray-500 leading-relaxed">{t('subtitle')}</p>

        {platform === 'android' ? (
          <AndroidPrompt onInstall={handleAndroidInstall} onDismiss={dismiss} t={t} />
        ) : (
          <IOSGuide t={t} />
        )}
      </div>
    </div>
  );
}

function AndroidPrompt({
  onInstall,
  onDismiss,
  t,
}: {
  onInstall: () => void;
  onDismiss: () => void;
  t: ReturnType<typeof useTranslations<'pwa'>>;
}) {
  return (
    <div className="flex gap-2 px-4 pb-4">
      <button
        onClick={onDismiss}
        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold active:scale-95 transition-all"
      >
        {t('not_now')}
      </button>
      <button
        onClick={onInstall}
        className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow shadow-orange-500/30 transition-all flex items-center justify-center gap-1.5"
      >
        <Download size={13} strokeWidth={2.5} />
        {t('install')}
      </button>
    </div>
  );
}

function IOSGuide({ t }: { t: ReturnType<typeof useTranslations<'pwa'>> }) {
  return (
    <div className="px-4 pb-4 space-y-2.5">
      <IOSStep number={1} label={t('ios_step1')} icon={<Share size={13} className="text-blue-500" strokeWidth={2} />} />
      <IOSStep number={2} label={t('ios_step2')} icon={<span className="text-blue-500 font-bold text-xs">+</span>} />
      <IOSStep number={3} label={t('ios_step3')} icon={<span className="text-blue-500 font-bold text-xs">✓</span>} />
    </div>
  );
}

function IOSStep({ number, label, icon }: { number: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
        {number}
      </div>
      <span className="text-xs text-gray-700 flex-1">{label}</span>
      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        {icon}
      </div>
    </div>
  );
}

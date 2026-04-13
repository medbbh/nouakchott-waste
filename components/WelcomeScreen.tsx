'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, MapPin, Bell, Leaf } from 'lucide-react';

const STORAGE_KEY = '0dechets_welcomed';

export default function WelcomeScreen() {
  const t = useTranslations('welcome');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl px-6 pt-8 pb-safe-10 shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow">
            <Leaf size={20} className="text-white" strokeWidth={1.75} />
          </div>
          <span className="font-bold text-lg text-gray-900">{t('title')}</span>
        </div>

        {/* Subtitle */}
        <p className="text-gray-500 text-sm leading-relaxed mb-7">
          {t('subtitle')}
        </p>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          <Step icon={<Camera size={18} className="text-orange-500" />} label={t('step1')} />
          <Step icon={<MapPin size={18} className="text-orange-500" />} label={t('step2')} />
          <Step icon={<Bell size={18} className="text-orange-500" />} label={t('step3')} />
        </div>

        {/* CTA */}
        <button
          onClick={dismiss}
          className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 transition-all text-sm"
        >
          {t('cta')}
        </button>
      </div>
    </div>
  );
}

function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-sm text-gray-700 font-medium">{label}</span>
    </div>
  );
}

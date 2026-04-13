'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Trash2, Archive, Truck, CircleHelp, CheckCircle, XCircle, X } from 'lucide-react';
import { Report, ReportCategory } from '@/types';
import { compressImage } from '@/lib/imageUtils';
import { uploadPhoto, insertReport } from '@/lib/supabase';
import { useFingerprint } from '@/context/FingerprintContext';

const CATEGORY_ICONS = {
  dump: Trash2,
  overflow: Archive,
  uncollected: Truck,
  other: CircleHelp,
};

const CATEGORIES: { id: ReportCategory }[] = [
  { id: 'dump' },
  { id: 'overflow' },
  { id: 'uncollected' },
  { id: 'other' },
];

interface ReportModalProps {
  onClose: () => void;
  onSuccess: (report: Report) => void;
  initialPhoto?: File;
  initialCoords?: { latitude: number; longitude: number } | null;
  onRetake?: () => void;
}

type LocationState = 'idle' | 'found' | 'failed';

export default function ReportModal({ onClose, onSuccess, initialPhoto, initialCoords, onRetake }: ReportModalProps) {
  const t = useTranslations('report');
  const tc = useTranslations('categories');
  const locale = useLocale();
  const { visitorId } = useFingerprint();

  const [photoFile] = useState<File | null>(initialPhoto ?? null);
  const [photoPreview] = useState<string | null>(() =>
    initialPhoto ? URL.createObjectURL(initialPhoto) : null,
  );
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [locationState] = useState<LocationState>(
    initialPhoto ? (initialCoords ? 'found' : 'failed') : 'idle',
  );
  const [coords] = useState<{ latitude: number; longitude: number } | null>(
    initialCoords ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!photoFile) { setError(t('error_photo')); return; }
    if (!category) { setError(t('error_category')); return; }
    if (!coords) { setError(t('error_location')); return; }
    if (!visitorId) return;

    setSubmitting(true);
    setError(null);

    try {
      const compressed = await compressImage(photoFile);
      const photoUrl = await uploadPhoto(compressed, visitorId);

      let neighborhood: string | null = null;
      try {
        const geoRes = await fetch(`/api/geocode?lat=${coords.latitude}&lng=${coords.longitude}`);
        const geoJson = await geoRes.json();
        neighborhood = geoJson.neighborhood ?? null;
      } catch { /* non-fatal */ }

      const report = await insertReport({
        photo_url: photoUrl,
        latitude: coords.latitude,
        longitude: coords.longitude,
        category,
        description: description.trim() || null,
        neighborhood,
        submitter_id: visitorId,
      });

      onSuccess(report);
    } catch {
      setError(t('error_submit'));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* Step 1: Photo (always pre-loaded) */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">1. {t('step_photo')}</p>
              <div className="relative">
                <img
                  src={photoPreview!}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                {onRetake && (
                  <button
                    onClick={onRetake}
                    className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                    {t('retake')}
                  </button>
                )}
                <div className="absolute top-2 left-2">
                  {locationState === 'found' && (
                    <span className="bg-green-600/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle size={11} /> {t('location_found')}
                    </span>
                  )}
                  {locationState === 'failed' && (
                    <span className="bg-red-600/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <XCircle size={11} /> {t('location_failed')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Category */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">2. {t('step_category')}</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id];
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        category === cat.id
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                      {tc(cat.id)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Description */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">3. {t('step_details')}</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('description_placeholder')}
                rows={3}
                dir={locale === 'ar' ? 'rtl' : 'auto'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !photoFile || !category || locationState !== 'found'}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {submitting ? t('submitting') : t('submit')}
            </button>
            <div className="pb-safe" />
          </div>
        </div>
      </div>
    </>
  );
}

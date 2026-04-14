'use client';

import { useState } from 'react';
import { Link2, X, MapPin, Calendar, CheckCheck, ImageDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Report, CATEGORY_COLORS, ReportCategory } from '@/types';
import { resolveVote } from '@/lib/supabase';
import { generateShareImage } from '@/lib/imageUtils';
import { useFingerprint } from '@/context/FingerprintContext';
import { hasResolvedLocally, markResolvedLocally } from '@/lib/fingerprint';

const RESOLVE_THRESHOLD = 3;

interface DetailModalProps {
  report: Report;
  onClose: () => void;
  onResolved?: (reportId: string) => void;
}

export default function DetailModal({ report, onClose, onResolved }: DetailModalProps) {
  const t = useTranslations('detail');
  const tc = useTranslations('categories');
  const { visitorId } = useFingerprint();

  const [status, setStatus] = useState(report.status);
  const [resolveVotes, setResolveVotes] = useState(report.resolve_votes ?? 0);
  const [resolveVoted, setResolveVoted] = useState(() => hasResolvedLocally(report.id));
  const [copying, setCopying] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  const reportUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}?report=${report.id}`
      : '';

  const formattedDate = new Date(report.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const handleResolveVote = async () => {
    if (resolveVoted || resolving || !visitorId || status === 'resolved') return;
    setResolving(true);
    try {
      const { newCount, resolved } = await resolveVote(report.id, visitorId);
      setResolveVotes(newCount);
      setResolveVoted(true);
      markResolvedLocally(report.id);
      if (resolved) {
        setStatus('resolved');
        onResolved?.(report.id);
      }
    } catch { /* silent */ } finally {
      setResolving(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(reportUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleWhatsApp = () => {
    const neighborhood = report.neighborhood ?? 'Mauritania';
    const category = tc(report.category);
    const text = t('whatsapp_text', { category, neighborhood, url: reportUrl });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleFacebook = () =>
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reportUrl)}`, '_blank', 'noopener,noreferrer');

  const handleShareImage = async () => {
    if (savingImage) return;
    setSavingImage(true);
    try {
      const blob = await generateShareImage(
        report.photo_url,
        tc(report.category),
        CATEGORY_COLORS[report.category as ReportCategory],
        report.neighborhood,
        report.created_at,
        report.latitude,
        report.longitude,
      );
      if (!blob) return;

      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isAndroid = /Android/.test(ua);

      if (isAndroid) {
        // Android: download triggers MediaScanner → image appears in Gallery app
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'report-0dechets.jpg';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      if (isIOS && navigator.share) {
        // iOS: Web Share API → user taps "Save Image" → saved to Photos
        // No other way to reach the Photos library from a browser
        const file = new File([blob], 'report-0dechets.jpg', { type: 'image/jpeg' });
        try {
          await navigator.share({ files: [file], title: '0Déchets' });
          return;
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
        }
      }

      // Desktop: direct download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report-0dechets.jpg';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* image generation failed */ } finally {
      setSavingImage(false);
    }
  };

  const color = CATEGORY_COLORS[report.category as ReportCategory];
  const isResolved = status === 'resolved';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">

        {/* Photo */}
        <div className="relative shrink-0">
          <img
            src={report.photo_url}
            alt="Report photo"
            className="w-full h-80 sm:h-72 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="absolute bottom-3 left-3 flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white shadow"
              style={{ backgroundColor: color }}
            >
              {tc(report.category)}
            </span>
            {isResolved && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white bg-gray-500 shadow flex items-center gap-1">
                <CheckCheck size={11} />
                {t('status_resolved')}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto">
          <div className="px-4 pt-3 pb-2">
            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap mb-2.5">
              {report.neighborhood && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {report.neighborhood}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formattedDate}
              </span>
            </div>

            {/* Action buttons row */}
            <div className="flex gap-2">
              {/* Resolve vote — hidden once resolved */}
              {status !== 'resolved' && (
                <button
                  onClick={handleResolveVote}
                  disabled={resolveVoted || resolving}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                    resolveVoted
                      ? 'border-green-300 bg-green-50 text-green-600 cursor-default'
                      : 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-500'
                  }`}
                >
                  <CheckCheck size={13} strokeWidth={2} className={resolveVoted ? 'text-green-500' : ''} />
                  <span className="hidden sm:inline">
                    {resolving ? t('resolving') : resolveVoted ? t('resolve_voted') : t('mark_resolved')}
                  </span>
                  <span className="bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                    {resolveVotes}/{RESOLVE_THRESHOLD}
                  </span>
                </button>
              )}
            </div>
          </div>

          {report.description && (
            <p className="px-4 pb-3 text-sm text-gray-700" dir="auto">
              {report.description}
            </p>
          )}

          {/* Share */}
          <div className="px-4 pb-safe-8 pt-1 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 mb-2">{t('share')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors"
              >
                <Link2 size={14} />
                <span className="hidden sm:inline">{copying ? t('copied') : t('copy_link')}</span>
                <span className="sm:hidden">{copying ? '✓' : <Link2 size={14} />}</span>
              </button>

              <button
                onClick={handleShareImage}
                disabled={savingImage}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ImageDown size={14} />
                <span className="hidden sm:inline">{savingImage ? '…' : t('share_image')}</span>
              </button>

              <button
                onClick={handleFacebook}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-blue-600 text-white rounded-xl py-2 hover:bg-blue-700 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                <span className="hidden sm:inline">{t('share_facebook')}</span>
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-green-500 text-white rounded-xl py-2 hover:bg-green-600 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                <span className="hidden sm:inline">{t('share_whatsapp')}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

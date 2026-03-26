'use client';

import { useState } from 'react';
import { ThumbsUp, Link2, MessageCircle, X, MapPin, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Report, CATEGORY_COLORS, ReportCategory } from '@/types';
import { upvoteReport } from '@/lib/supabase';
import { useFingerprint } from '@/context/FingerprintContext';
import { hasVotedLocally, markVotedLocally } from '@/lib/fingerprint';

interface DetailModalProps {
  report: Report;
  onClose: () => void;
  onUpvoted: (reportId: string, newCount: number) => void;
}

export default function DetailModal({ report, onClose, onUpvoted }: DetailModalProps) {
  const t = useTranslations('detail');
  const tc = useTranslations('categories');
  const { visitorId } = useFingerprint();

  const [upvotes, setUpvotes] = useState(report.upvotes);
  const [voted, setVoted] = useState(() => hasVotedLocally(report.id));
  const [copying, setCopying] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  const reportUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}?report=${report.id}`
      : '';

  const formattedDate = new Date(report.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleUpvote = async () => {
    if (voted || !visitorId || upvoting) return;
    setUpvoting(true);
    try {
      await upvoteReport(report.id, visitorId);
      const newCount = upvotes + 1;
      setUpvotes(newCount);
      setVoted(true);
      markVotedLocally(report.id);
      onUpvoted(report.id, newCount);
    } catch {
      // Already voted or error — ignore silently
    } finally {
      setUpvoting(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(reportUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reportUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(reportUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const color = CATEGORY_COLORS[report.category as ReportCategory];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto shadow-2xl">
        {/* Photo */}
        <div className="relative">
          <img
            src={report.photo_url}
            alt="Report photo"
            className="w-full h-56 object-cover sm:rounded-t-2xl rounded-t-2xl"
            loading="lazy"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: color }}
            >
              {tc(report.category)}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${
                report.status === 'resolved' ? 'bg-green-600' : 'bg-red-500'
              }`}
            >
              {report.status === 'resolved' ? t('status_resolved') : t('status_open')}
            </span>
          </div>

          {/* Meta */}
          <div className="text-sm text-gray-500 space-y-1.5">
            {report.neighborhood && (
              <p className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400 shrink-0" />
                {report.neighborhood}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              {formattedDate}
            </p>
            {report.description && (
              <p className="text-gray-700 mt-1" dir="auto">
                {report.description}
              </p>
            )}
          </div>

          {/* Upvote */}
          <button
            onClick={handleUpvote}
            disabled={voted || upvoting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
              voted
                ? 'border-orange-300 bg-orange-50 text-orange-600 cursor-default'
                : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500'
            }`}
          >
            <ThumbsUp size={15} strokeWidth={2} className={voted ? 'fill-orange-400 text-orange-400' : ''} />
            {voted ? t('upvoted') : t('upvote')}
            <span className="ml-1 bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
              {upvotes}
            </span>
          </button>

          {/* Share */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-400 mb-2">{t('share')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
              >
                <Link2 size={13} />
                {copying ? t('copied') : t('copy_link')}
              </button>
              <button
                onClick={handleFacebook}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-blue-600 text-white rounded-xl py-2.5 hover:bg-blue-700 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                {t('share_facebook')}
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-green-500 text-white rounded-xl py-2.5 hover:bg-green-600 transition-colors"
              >
                <MessageCircle size={13} />
                {t('share_whatsapp')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

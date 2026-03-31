'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Camera, Leaf } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Report } from '@/types';
import { fetchReport } from '@/lib/supabase';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import WelcomeScreen from '@/components/WelcomeScreen';

// Kick off reports fetch immediately at module load — runs before React mounts
const reportsPromise = typeof window !== 'undefined' ? import('@/lib/supabase').then(m => m.fetchReports()) : Promise.resolve([]);

// Load map without SSR (Mapbox requires browser)
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
const ReportModal = dynamic(() => import('@/components/ReportModal'), { ssr: false });
const DetailModal = dynamic(() => import('@/components/DetailModal'), { ssr: false });

function PageContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Initial load — uses the already-in-flight promise
  useEffect(() => {
    reportsPromise
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Deep-link: ?report=ID
  useEffect(() => {
    const reportId = searchParams.get('report');
    if (!reportId) return;

    // Check if already in local list
    const existing = reports.find((r) => r.id === reportId);
    if (existing) {
      setSelectedReport(existing);
      return;
    }

    // Fetch from DB if not in list yet
    fetchReport(reportId).then((r) => {
      if (r) setSelectedReport(r);
    });
  }, [searchParams, reports]);

  const handleReportClick = useCallback((report: Report) => {
    setSelectedReport(report);
  }, []);

  const handleReportsUpdate = useCallback((updated: Report[]) => {
    setReports(updated);
  }, []);

  const handleReportSuccess = useCallback(() => {
    setShowReportModal(false);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  }, []);

  const handleDetailClose = useCallback(() => {
    setSelectedReport(null);
    // Remove ?report= from URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.delete('report');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleUpvoted = useCallback((reportId: string, newCount: number) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, upvotes: newCount } : r)),
    );
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-gray-100">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-none">
          <Leaf size={20} className="text-orange-400" strokeWidth={1.75} />
          <span className="text-white font-semibold text-sm drop-shadow">
            {t('nav.title')}
          </span>
          {!loading && reports.length > 0 && (
            <span className="bg-orange-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              {reports.length}
              <span className="hidden sm:inline">{t('map.reports_label')}</span>
            </span>
          )}
        </div>
        <div className="pointer-events-auto">
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Full-screen map */}
      <div className="absolute inset-0">
        {!loading && (
          <Map
            reports={reports}
            onReportClick={handleReportClick}
            onReportsUpdate={handleReportsUpdate}
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{t('map.loading')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Report button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold px-6 py-3.5 rounded-full shadow-lg shadow-orange-500/40 transition-all text-sm"
        >
          <Camera size={18} strokeWidth={2} />
          {t('report.button')}
        </button>
      </div>

      {/* Report count badge */}

      {/* Success toast */}
      {successToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium animate-bounce">
          ✓ {t('report.success')}
        </div>
      )}

      {/* Modals */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSuccess={handleReportSuccess}
        />
      )}

      {selectedReport && (
        <DetailModal
          report={selectedReport}
          onClose={handleDetailClose}
          onUpvoted={handleUpvoted}
        />
      )}

      <WelcomeScreen />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}

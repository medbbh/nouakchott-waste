'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Camera, Leaf, ArrowDown, Trophy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Report } from '@/types';
import { fetchReport, fetchReports } from '@/lib/supabase';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import WelcomeScreen from '@/components/WelcomeScreen';

// Kick off reports fetch immediately at module load — runs before React mounts
const reportsPromise = typeof window !== 'undefined' ? import('@/lib/supabase').then(m => m.fetchReports()) : Promise.resolve([]);

// Load map without SSR (Mapbox requires browser)
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
const CameraCapture = dynamic(() => import('@/components/CameraCapture'), { ssr: false });
const ReportModal = dynamic(() => import('@/components/ReportModal'), { ssr: false });
const DetailModal = dynamic(() => import('@/components/DetailModal'), { ssr: false });
const SharePrompt = dynamic(() => import('@/components/SharePrompt'), { ssr: false });
const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), { ssr: false });
const Leaderboard = dynamic(() => import('@/components/Leaderboard'), { ssr: false });

type ReportStage = null | 'camera' | 'form';
type PendingPhoto = { file: File; coords: { latitude: number; longitude: number } | null };

function PageContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportStage, setReportStage] = useState<ReportStage>(null);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [sharePromptReport, setSharePromptReport] = useState<Report | null>(null);
  const [successToast, setSuccessToast] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Pull-to-refresh
  const PULL_THRESHOLD = 72;
  const pullStartY = useRef<number | null>(null);
  const pullProgressRef = useRef(0);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const pullRefreshingRef = useRef(false);

  // Initial load — uses the already-in-flight promise
  useEffect(() => {
    reportsPromise.then(setReports).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Pull-to-refresh touch handlers
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (pullRefreshingRef.current) return;
      // Only start tracking when the touch begins in the top 80px (navbar zone)
      if (e.touches[0].clientY < 80) {
        pullStartY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (pullStartY.current === null || pullRefreshingRef.current) return;
      const delta = e.touches[0].clientY - pullStartY.current;
      if (delta <= 0) {
        pullStartY.current = null;
        pullProgressRef.current = 0;
        setPullProgress(0);
        return;
      }
      const p = Math.min(delta / PULL_THRESHOLD, 1);
      pullProgressRef.current = p;
      setPullProgress(p);
    };

    const onTouchEnd = async () => {
      if (pullStartY.current === null) return;
      pullStartY.current = null;
      const triggered = pullProgressRef.current >= 1;
      pullProgressRef.current = 0;
      setPullProgress(0);

      if (!triggered) return;
      pullRefreshingRef.current = true;
      setPullRefreshing(true);
      try {
        const updated = await fetchReports();
        setReports(updated);
      } catch { /* silent */ } finally {
        pullRefreshingRef.current = false;
        setPullRefreshing(false);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
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

  // Open camera directly on Report button click — call getUserMedia synchronously
  // within the gesture handler so iOS Safari doesn't re-prompt for permission
  const handleReportButtonClick = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((stream) => {
        setPendingStream(stream);
        setReportStage('camera');
      })
      .catch(() => {
        // Permission denied — show camera so CameraCapture can display the error
        setReportStage('camera');
      });
  }, []);

  const handleCameraCapture = useCallback(
    (file: File, coords: { latitude: number; longitude: number } | null) => {
      setPendingPhoto({ file, coords });
      setPendingStream(null);
      setReportStage('form');
    },
    [],
  );

  const handleCameraClose = useCallback(() => {
    pendingStream?.getTracks().forEach((t) => t.stop());
    setPendingStream(null);
    setReportStage(null);
  }, [pendingStream]);

  const handleRetake = useCallback(() => {
    setPendingPhoto(null);
    // Permission already granted — CameraCapture calls getUserMedia on its own
    setReportStage('camera');
  }, []);

  const handleModalClose = useCallback(() => {
    setPendingPhoto(null);
    setReportStage(null);
  }, []);

  const handleReportClick = useCallback((report: Report) => {
    setSelectedReport(report);
  }, []);

  const handleReportsUpdate = useCallback((updated: Report[]) => {
    setReports(updated);
  }, []);

  const handleReportSuccess = useCallback((report: Report) => {
    setPendingPhoto(null);
    setReportStage(null);
    setSharePromptReport(report);
  }, []);

  const handleSharePromptDismiss = useCallback(() => {
    setSharePromptReport(null);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  }, []);

  const handleResolved = useCallback((reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' as const } : r)),
    );
    setSelectedReport((prev) =>
      prev?.id === reportId ? { ...prev, status: 'resolved' as const } : prev,
    );
  }, []);

  const handleDetailClose = useCallback(() => {
    setSelectedReport(null);
    // Remove ?report= from URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.delete('report');
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-gray-100">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pt-safe-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-none">
          <Leaf size={20} className="text-orange-400" strokeWidth={1.75} />
          <span className="text-white font-semibold text-sm drop-shadow">
            {t('nav.title')}
          </span>
          {loading ? (
            <span className="bg-orange-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </span>
          ) : reports.length > 0 && (
            <span className="bg-orange-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              {reports.length}
              <span className="hidden sm:inline">{t('map.reports_label')}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-5 pointer-events-auto">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="text-white hover:text-orange-300 transition-colors"
            aria-label="Leaderboard"
          >
            <Trophy size={24} strokeWidth={1.75} />
          </button>
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Pull-to-refresh indicator */}
      {(pullProgress > 0 || pullRefreshing) && (
        <div
          className="absolute left-1/2 z-20 pointer-events-none"
          style={{
            top: 'calc(env(safe-area-inset-top) + 54px)',
            transform: `translateX(-50%) translateY(${pullRefreshing ? 0 : Math.round((pullProgress - 1) * 48)}px)`,
            opacity: pullRefreshing ? 1 : pullProgress,
            transition: pullRefreshing ? 'none' : 'transform 0.05s linear, opacity 0.05s linear',
          }}
        >
          <div className="bg-white rounded-full shadow-lg w-9 h-9 flex items-center justify-center">
            {pullRefreshing ? (
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowDown
                size={16}
                className="text-orange-500 transition-transform duration-200"
                style={{ transform: pullProgress >= 1 ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <Map
          reports={reports}
          onReportClick={handleReportClick}
          onReportsUpdate={handleReportsUpdate}
        />
      </div>

      {/* Floating Report button */}
      <div className="absolute bottom-safe-8 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={handleReportButtonClick}
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

      {/* Camera — opens first before the form modal */}
      {reportStage === 'camera' && (
        <CameraCapture
          initialStream={pendingStream ?? undefined}
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
        />
      )}

      {/* Report form — opens after photo is taken */}
      {reportStage === 'form' && pendingPhoto && (
        <ReportModal
          initialPhoto={pendingPhoto.file}
          initialCoords={pendingPhoto.coords}
          onRetake={handleRetake}
          onClose={handleModalClose}
          onSuccess={handleReportSuccess}
        />
      )}

      {selectedReport && (
        <DetailModal
          report={selectedReport}
          onClose={handleDetailClose}
          onResolved={handleResolved}
        />
      )}

      {sharePromptReport && (
        <SharePrompt
          report={sharePromptReport}
          onDismiss={handleSharePromptDismiss}
        />
      )}

      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}

      <WelcomeScreen />
      <PWAInstallPrompt />
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

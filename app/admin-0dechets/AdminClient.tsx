'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, LogOut, MapPin, Calendar, CheckCheck, ChartNoAxesColumn, ChevronLeft, ChevronRight } from 'lucide-react';
import { logout, deleteReport } from './actions';
import { Report } from '@/types';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  dump:        { label: 'Illegal Dump',  color: '#C4572A' },
  overflow:    { label: 'Bin Overflow',  color: '#E8A838' },
  uncollected: { label: 'Uncollected',   color: '#5C6B3A' },
  other:       { label: 'Other',         color: '#8A7F6E' },
};

export interface AdminStats {
  byCategory: Record<string, number>;
}

type Filter = 'all' | 'open' | 'resolved';

const PAGE_SIZE = 4;

interface Props {
  reports: Report[];
  stats: AdminStats;
}

export default function AdminClient({ reports: initial, stats }: Props) {
  const [reports, setReports]     = useState(initial);
  const [filter, setFilter]       = useState<Filter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setReports(initial); }, [initial]);

  const filtered = reports.filter(r =>
    filter === 'all' ? true : r.status === filter,
  );

  const pages: Report[][] = [];
  for (let i = 0; i < filtered.length; i += PAGE_SIZE) {
    pages.push(filtered.slice(i, i + PAGE_SIZE));
  }
  const totalPages = pages.length;

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(0);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [filter]);

  // Keep currentPage in bounds after a deletion
  useEffect(() => {
    if (currentPage > 0 && currentPage >= totalPages) {
      const newPage = Math.max(0, totalPages - 1);
      setCurrentPage(newPage);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: newPage * scrollRef.current.clientWidth, behavior: 'smooth' });
      }
    }
  }, [totalPages, currentPage]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const page = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
    setCurrentPage(page);
  }

  function goToPage(page: number) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: page * scrollRef.current.clientWidth, behavior: 'smooth' });
    setCurrentPage(page);
  }

  const maxCat = Math.max(1, ...Object.values(stats.byCategory));

  async function handleDelete(report: Report) {
    if (!confirm('Delete this report and its photo permanently?')) return;
    setDeletingId(report.id);
    try {
      await deleteReport(report.id, report.photo_url);
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch {
      alert('Failed to delete — try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-orange-500 text-lg tracking-tight">0Déchets</span>
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Admin
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors py-2"
            >
              <LogOut size={13} />
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── Category breakdown ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <ChartNoAxesColumn size={11} />
            Categories
          </p>
          <div className="space-y-3.5">
            {Object.entries(CATEGORY_META).map(([key, { label, color }]) => {
              const count = stats.byCategory[key] ?? 0;
              const pct   = (count / maxCat) * 100;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                    <span className="text-sm font-bold text-gray-800 tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Reports ─────────────────────────────────────────────── */}
        <section>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Reports&nbsp;({filtered.length})
            </p>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
              {(['all', 'open', 'resolved'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium capitalize ${
                    filter === f
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center text-gray-300 text-sm py-16">No reports</div>
          ) : (
            <>
              {/* Carousel */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {pages.map((page, pageIdx) => (
                  <div key={pageIdx} className="shrink-0 w-full snap-start space-y-2">
                    {page.map(report => {
                      const meta       = CATEGORY_META[report.category] ?? CATEGORY_META.other;
                      const date       = new Date(report.created_at).toLocaleDateString('en', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      });
                      const isDeleting = deletingId === report.id;

                      return (
                        <div
                          key={report.id}
                          className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 p-3 transition-opacity ${
                            isDeleting ? 'opacity-40 pointer-events-none' : ''
                          }`}
                        >
                          <img
                            src={report.photo_url}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: meta.color }}
                              >
                                {meta.label}
                              </span>
                              {report.status === 'resolved' && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex items-center gap-0.5">
                                  <CheckCheck size={9} />
                                  Resolved
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 mt-1 text-[11px] text-gray-400 flex-wrap">
                              {report.neighborhood && (
                                <span className="flex items-center gap-0.5 truncate">
                                  <MapPin size={9} />
                                  {report.neighborhood}
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 shrink-0">
                                <Calendar size={9} />
                                {date}
                              </span>
                            </div>
                            {report.description && (
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{report.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(report)}
                            disabled={!!deletingId}
                            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-gray-200 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                            aria-label="Delete report"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-20"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {pages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToPage(i)}
                        className={`rounded-full transition-all duration-200 ${
                          i === currentPage
                            ? 'w-5 h-1.5 bg-orange-500'
                            : 'w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-20"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

      </main>
    </div>
  );
}

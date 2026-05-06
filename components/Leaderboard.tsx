'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Pencil, Check } from 'lucide-react';
import { useFingerprint } from '@/context/FingerprintContext';
import { fetchLeaderboard, upsertProfile } from '@/lib/supabase';
import { LeaderboardEntry } from '@/types';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
  onClose: () => void;
}

export default function Leaderboard({ onClose }: LeaderboardProps) {
  const t = useTranslations('leaderboard');
  const { visitorId } = useFingerprint();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLeaderboard(visitorId)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [visitorId]);

  const myEntry = entries.find((e) => e.is_me);

  const handleEditStart = () => {
    setNameInput(myEntry?.display_name ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!visitorId) return;
    setSaving(true);
    try {
      await upsertProfile(visitorId, nameInput);
      setEntries((prev) =>
        prev.map((e) => (e.is_me ? { ...e, display_name: nameInput.trim() || null } : e)),
      );
      setEditing(false);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md rounded-t-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">🏆 {t('title')}</h2>
            <p className="text-xs text-gray-400">{t('subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto pb-safe">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">{t('empty')}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {entries.map((entry, i) => {
                const isMe = entry.is_me;
                const name = entry.display_name;

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 py-3 ${isMe ? 'bg-orange-50 border-l-4 border-orange-500 pl-3 pr-4' : 'px-4'}`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center shrink-0">
                      {i < 3 ? (
                        <span className="text-xl leading-none">{MEDALS[i]}</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-400">{i + 1}</span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      {isMe && editing ? (
                        <input
                          autoFocus
                          maxLength={30}
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') setEditing(false);
                          }}
                          placeholder={t('edit_name_placeholder')}
                          className="w-full border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-sm font-medium truncate ${
                              isMe ? 'text-orange-700' : 'text-gray-800'
                            } ${!name ? 'italic text-gray-400' : ''}`}
                          >
                            {name ?? t('anonymous')}
                          </span>
                          {isMe && (
                            <span className="shrink-0 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold">
                              {t('you')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Report count */}
                    <span className="text-sm font-semibold text-gray-600 shrink-0">
                      {entry.report_count} <span className="font-normal text-gray-400 text-xs">{t('reports')}</span>
                    </span>

                    {/* Edit / Save (own row only) */}
                    {isMe && (
                      editing ? (
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                        >
                          {saving ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleEditStart}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

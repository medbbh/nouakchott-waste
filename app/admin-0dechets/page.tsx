import { cookies } from 'next/headers';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { login } from './actions';
import { ADMIN_COOKIE, adminToken } from './auth';
import AdminClient, { AdminStats } from './AdminClient';
import { Report } from '@/types';

function isAuthenticated(): boolean {
  return cookies().get(ADMIN_COOKIE)?.value === adminToken();
}

function computeStats(reports: Report[]): AdminStats {
  return {
    byCategory: {
      dump:        reports.filter(r => r.category === 'dump').length,
      overflow:    reports.filter(r => r.category === 'overflow').length,
      uncollected: reports.filter(r => r.category === 'uncollected').length,
      other:       reports.filter(r => r.category === 'other').length,
    },
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8">
          <div className="text-center mb-7">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-orange-500" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Admin Access</h1>
            <p className="text-sm text-gray-400 mt-1">0Déchets Dashboard</p>
          </div>

          <form action={login} className="space-y-3">
            <input
              name="username"
              type="text"
              placeholder="Username"
              autoComplete="username"
              autoFocus
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            {searchParams.error && (
              <p className="text-xs text-red-500 text-center">Invalid credentials — try again.</p>
            )}
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { data } = await supabase
    .from('reports')
    .select(
      'id, created_at, photo_url, latitude, longitude, category, description, neighborhood, status, upvotes, resolve_votes',
    )
    .order('created_at', { ascending: false })
    .limit(500);

  const reports = (data ?? []) as Report[];

  return <AdminClient reports={reports} stats={computeStats(reports)} />;
}

import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedVisitorId: string | null = null;

export async function getVisitorId(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  cachedVisitorId = result.visitorId;
  return cachedVisitorId;
}

const VOTED_KEY = 'nwk_voted_reports';

export function hasVotedLocally(reportId: string): boolean {
  if (typeof window === 'undefined') return false;
  const voted = JSON.parse(localStorage.getItem(VOTED_KEY) ?? '[]') as string[];
  return voted.includes(reportId);
}

export function markVotedLocally(reportId: string): void {
  if (typeof window === 'undefined') return;
  const voted = JSON.parse(localStorage.getItem(VOTED_KEY) ?? '[]') as string[];
  if (!voted.includes(reportId)) {
    voted.push(reportId);
    localStorage.setItem(VOTED_KEY, JSON.stringify(voted));
  }
}

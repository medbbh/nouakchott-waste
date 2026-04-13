export type ReportCategory = 'dump' | 'overflow' | 'uncollected' | 'other';
export type ReportStatus = 'open' | 'resolved';

export interface Report {
  id: string;
  created_at: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  category: ReportCategory;
  description: string | null;
  neighborhood: string | null;
  status: ReportStatus;
  upvotes: number;
  resolve_votes: number;
}

export const CATEGORY_COLORS: Record<ReportCategory, string> = {
  dump: '#C4572A',
  overflow: '#E8A838',
  uncollected: '#5C6B3A',
  other: '#8A7F6E',
};

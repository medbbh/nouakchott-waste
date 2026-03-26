import { createClient } from '@supabase/supabase-js';
import { Report } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Select only public-safe fields — never expose submitter_id or upvoted_by
const PUBLIC_FIELDS = 'id, created_at, photo_url, latitude, longitude, category, description, neighborhood, status, upvotes';

export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(PUBLIC_FIELDS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select(PUBLIC_FIELDS)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function insertReport(params: {
  photo_url: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string | null;
  neighborhood: string | null;
  submitter_id: string;
}): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert(params)
    .select(PUBLIC_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

export async function upvoteReport(reportId: string, visitorId: string): Promise<void> {
  // Fetch current upvoted_by to check for duplicates
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('upvoted_by, upvotes')
    .eq('id', reportId)
    .single();

  if (fetchError) throw fetchError;

  if ((report.upvoted_by as string[]).includes(visitorId)) {
    throw new Error('Already voted');
  }

  const { error } = await supabase
    .from('reports')
    .update({
      upvotes: report.upvotes + 1,
      upvoted_by: [...report.upvoted_by, visitorId],
    })
    .eq('id', reportId);

  if (error) throw error;
}

export async function uploadPhoto(file: File, visitorId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${visitorId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('report-photos')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('report-photos').getPublicUrl(path);
  return data.publicUrl;
}

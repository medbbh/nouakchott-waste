'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ADMIN_COOKIE, adminToken } from './auth';

const getUser = () => process.env.ADMIN_USERNAME ?? 'admin';
const getPwd  = () => process.env.ADMIN_PASSWORD ?? 'admin123';

export async function login(formData: FormData) {
  const username = (formData.get('username') as string ?? '').trim();
  const password = formData.get('password') as string;
  if (username === getUser() && password === getPwd()) {
    cookies().set(ADMIN_COOKIE, adminToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    redirect('/admin-0dechets');
  }
  redirect('/admin-0dechets?error=1');
}

export async function logout() {
  cookies().delete(ADMIN_COOKIE);
  redirect('/admin-0dechets');
}

export async function deleteReport(id: string, photoUrl: string) {
  const match = photoUrl.match(/\/report-photos\/(.+?)(?:\?|$)/);
  if (match?.[1]) {
    await supabaseAdmin.storage
      .from('report-photos')
      .remove([decodeURIComponent(match[1])]);
  }
  const { error } = await supabaseAdmin.from('reports').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/admin-0dechets');
}


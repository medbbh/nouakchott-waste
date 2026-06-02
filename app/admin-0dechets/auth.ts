import { createHash } from 'crypto';

export const ADMIN_COOKIE = 'admin_auth';

export function adminToken(): string {
  const user = process.env.ADMIN_USERNAME ?? 'admin';
  const pwd  = process.env.ADMIN_PASSWORD ?? 'admin123';
  return createHash('sha256').update(`${user}:${pwd}`).digest('hex');
}

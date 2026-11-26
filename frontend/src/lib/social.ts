export type SocialPlatform = 'instagram' | 'facebook' | 'youtube' | 'linkedin' | 'x' | 'tiktok' | 'behance' | 'pinterest' | 'github' | 'website';
export type SocialAccount = { platform: SocialPlatform; label: string; username: string; href: string };

const HOSTS: [RegExp, SocialPlatform, string][] = [
  [/(^|\.)instagram\.com$/, 'instagram', 'Instagram'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, 'facebook', 'Facebook'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube', 'YouTube'],
  [/(^|\.)linkedin\.com$/, 'linkedin', 'LinkedIn'],
  [/(^|\.)twitter\.com$|(^|\.)x\.com$/, 'x', 'X'],
  [/(^|\.)tiktok\.com$/, 'tiktok', 'TikTok'],
  [/(^|\.)behance\.net$/, 'behance', 'Behance'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'pinterest', 'Pinterest'],
  [/(^|\.)github\.com$/, 'github', 'GitHub'],
];
// Path segments that are navigation, not a person.
const SKIP = new Set(['in', 'company', 'user', 'channel', 'c', 'u', 'pub', 'profile.php', 'people', 'p', 'gallery', 'users']);

/**
 * Turns whatever the admin typed — a profile URL, a URL without https, or a bare
 * "@username" (treated as Instagram) — into a platform, a display username and a safe link.
 */
export function parseSocial(value: string | null | undefined): SocialAccount | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(raw) && !raw.includes('.com')) {
    const username = raw.replace(/^@/, '');
    return { platform: 'instagram', label: 'Instagram', username, href: `https://www.instagram.com/${username}/` };
  }
  let url: URL;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const match = HOSTS.find(([pattern]) => pattern.test(host));
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const person = segments.find(segment => !SKIP.has(segment.toLowerCase())) || '';
  const username = person.replace(/^@/, '');
  if (!match) return { platform: 'website', label: host, username: host, href: url.toString() };
  const [, platform, label] = match;
  return { platform, label, username: username || label, href: url.toString() };
}

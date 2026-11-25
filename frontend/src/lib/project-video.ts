export type ProjectVideoSource =
  | { kind: 'file'; src: string }
  | { kind: 'embed'; src: string };

function trustedHost(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/** Parse supported project video links without substituting demo content. */
export function getProjectVideoSource(
  value: string,
  options: { autoplay?: boolean; muted?: boolean } = {},
): ProjectVideoSource | null {
  const raw = value.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw, window.location.origin);
    const autoplay = options.autoplay ? '1' : '0';
    const muted = options.muted ? '1' : '0';

    if (trustedHost(url.hostname, 'youtu.be') || trustedHost(url.hostname, 'youtube.com') || trustedHost(url.hostname, 'youtube-nocookie.com')) {
      const path = url.pathname.split('/').filter(Boolean);
      const id = trustedHost(url.hostname, 'youtu.be')
        ? path[0]
        : url.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(path[0] || '') ? path[1] : '');
      if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return null;
      const params = new URLSearchParams({ autoplay, mute: muted, controls: '1', playsinline: '1', rel: '0' });
      return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}?${params}` };
    }

    if (trustedHost(url.hostname, 'vimeo.com')) {
      const path = url.pathname.split('/').filter(Boolean);
      const id = path[0] === 'video' ? path[1] : path[path.length - 1];
      if (!id || !/^\d+$/.test(id)) return null;
      const params = new URLSearchParams({ autoplay, muted, controls: '1', playsinline: '1', title: '0', byline: '0' });
      return { kind: 'embed', src: `https://player.vimeo.com/video/${id}?${params}` };
    }

    // Keep existing relative uploads working alongside direct MP4/WebM links.
    if (/\.(mp4|webm|m4v|mov)$/i.test(url.pathname)) {
      return { kind: 'file', src: url.href };
    }
    return null;
  } catch {
    return null;
  }
}

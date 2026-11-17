const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const THUMBNAIL_QUALITIES = [
  { name: 'maxresdefault', minimumWidth: 320 },
  { name: 'hqdefault', minimumWidth: 120 },
  { name: 'mqdefault', minimumWidth: 120 },
] as const;

export function extractYoutubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] || null;
    } else if (host === 'youtube.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (url.pathname === '/watch' || url.pathname.endsWith('/watch')) id = url.searchParams.get('v');
      else if (['shorts', 'embed'].includes(parts[0])) id = parts[1] || null;
    }

    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function isYoutubeUrl(value: string) {
  try {
    const host = new URL(value.trim()).hostname.toLowerCase().replace(/^(www|m)\./, '');
    return host === 'youtube.com' || host === 'youtu.be';
  } catch {
    return /(^|\/)\s*(www\.)?(youtube\.com|youtu\.be)(\/|$)/i.test(value.trim());
  }
}

function imageLoads(url: string, minimumWidth: number): Promise<boolean> {
  return new Promise(resolve => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.src = '';
      resolve(false);
    }, 10000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image.naturalWidth >= minimumWidth && image.naturalHeight > 0);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    image.src = url;
  });
}

export async function fetchYoutubeThumbnail(videoId: string): Promise<string> {
  if (!YOUTUBE_ID_PATTERN.test(videoId)) throw new Error('This does not look like a valid YouTube video ID.');

  for (const quality of THUMBNAIL_QUALITIES) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality.name}.jpg`;
    if (await imageLoads(url, quality.minimumWidth)) return url;
  }

  throw new Error('YouTube did not provide a usable thumbnail for this video. Check the URL or try again.');
}

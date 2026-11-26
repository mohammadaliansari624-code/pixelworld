import type { SyntheticEvent } from 'react';

/** A 3:2 on-brand placeholder, used whenever a thumbnail is missing or fails to load. */
export function placeholderFor(title: string) {
  const safe = title.replace(/[<>&"']/g, ' ').trim().slice(0, 30).toUpperCase();
  // Shrink long titles so they stay inside the 720px-wide canvas.
  const size = Math.max(26, Math.min(54, Math.floor(640 / Math.max(safe.length, 1) / 0.62)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14161b"/><stop offset="1" stop-color="#0b1a3a"/></linearGradient></defs><rect width="720" height="480" fill="url(#g)"/><text x="40" y="410" fill="#eeeae2" font-family="Impact,Arial Narrow,sans-serif" font-size="${size}" letter-spacing="1">${safe}</text><text x="40" y="70" fill="#7EAEFF" font-family="Arial,sans-serif" font-size="20" letter-spacing="6">PIXEL WRLD</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * onError handler for <img>: one cache-busted retry (flaky mobile network, cold backend),
 * then the placeholder, so a tile is never left as a broken-image icon.
 */
export function retryThenPlaceholder(event: SyntheticEvent<HTMLImageElement>, title: string) {
  const image = event.currentTarget;
  const stage = image.dataset.fallbackStage || '0';
  if (stage === '0' && !image.src.startsWith('data:')) {
    image.dataset.fallbackStage = '1';
    const original = image.src;
    window.setTimeout(() => { image.src = original + (original.includes('?') ? '&' : '?') + 'pwr=1'; }, 1200);
    return;
  }
  if (stage !== '2') {
    image.dataset.fallbackStage = '2';
    image.src = placeholderFor(title);
  }
}

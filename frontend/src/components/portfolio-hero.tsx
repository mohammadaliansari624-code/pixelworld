import { useEffect, useMemo, useState } from 'react';
import HelixRibbonHero, { type HelixProject } from './ui/helix-ribbon-hero';
import { placeholderFor } from '../lib/image-fallback';

export type PortfolioProject = {
  id: number;
  title: string;
  category: string;
  thumbnail_url: string;
};

function useMobileViewport() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 719px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 719px)');
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return mobile;
}

const withRetryParam = (src: string) => src + (src.includes('?') ? '&' : '?') + 'pwr=1';

function useSafeImages(sources: string[], mobile: boolean) {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const key = sources.join('|');
  useEffect(() => {
    if (mobile) return;
    let live = true;
    const timers: number[] = [];
    const set = (src: string, value: string) => live && setResolved(prev => (prev[src] === value ? prev : { ...prev, [src]: value }));
    sources.forEach(src => {
      if (!src) return;
      const attempt = (url: string, retried: boolean) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { if (url !== src) set(src, url); };
        img.onerror = () => {
          if (!retried) timers.push(window.setTimeout(() => attempt(withRetryParam(src), true), 1500));
          else set(src, '');
        };
        img.src = url;
      };
      attempt(src, false);
    });
    return () => { live = false; timers.forEach(window.clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mobile]);
  return resolved;
}

export function PortfolioHero({ projects, bio }: { projects: PortfolioProject[]; bio: string; onSelect: (id: number) => void }) {
  const mobile = useMobileViewport();
  const resolved = useSafeImages(projects.map(project => project.thumbnail_url), mobile);
  const items = useMemo(() => projects.map(project => {
    const state = resolved[project.thumbnail_url];
    const src = !project.thumbnail_url || state === '' ? placeholderFor(project.title) : state || project.thumbnail_url;
    return { id: project.id, helix: { src, title: project.title } as HelixProject };
  }), [projects, resolved]);

  // Mobile skips the ribbon. On desktop, the ribbon is a cinematic transition only;
  // category-specific project rails below are the actual portfolio, so no mixed grid lands here.
  if (mobile || !items.length) return null;
  const grid = items.slice(0, 6).map(item => item.helix);
  // The ribbon needs enough cards to read as a ribbon; a short catalogue is cycled to fill it.
  const ribbonLength = Math.min(12, Math.max(8, items.length));
  const ribbon = Array.from({ length: ribbonLength }, (_, i) => items[i % items.length].helix);

  return <HelixRibbonHero
    height="calc(100svh - var(--pw-header-h))"
    stickyTop="var(--pw-header-h)"
    screens={5}
    greeting="A few good"
    name="cuts."
    nameColor="#176BFF"
    portrait={items[0].helix.src}
    portraitAlt={items[0].helix.title}
    projects={[]}
    ribbonProjects={ribbon}
    count={`( ${projects.length} project${projects.length === 1 ? '' : 's'} )`}
    bio={bio}
    scrollHint="Scroll down"
    background="#090a0c"
    foreground="#eeeae2"
    showNav={false}
  />;
}

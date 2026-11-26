import { useMemo } from 'react';
import HelixRibbonHero, { type HelixProject } from './ui/helix-ribbon-hero';
import { placeholderFor } from '../lib/image-fallback';

export type PortfolioProject = {
  id: number;
  title: string;
  category: string;
  thumbnail_url: string;
};

export function PortfolioHero({ projects, bio, onSelect }: { projects: PortfolioProject[]; bio: string; onSelect: (id: number) => void }) {
  const items = useMemo(() => projects.map(project => {
    const src = project.thumbnail_url || placeholderFor(project.title);
    return { id: project.id, helix: { src, title: project.title } as HelixProject };
  }), [projects]);

  if (!items.length) return null;
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
    portrait={grid[0].src}
    portraitAlt={items[0].helix.title}
    projects={grid}
    ribbonProjects={ribbon}
    count={`( ${projects.length} project${projects.length === 1 ? '' : 's'} )`}
    bio={bio}
    scrollHint="Scroll down"
    background="#090a0c"
    foreground="#eeeae2"
    showNav={false}
    onSelect={index => onSelect(items[index].id)}
  />;
}

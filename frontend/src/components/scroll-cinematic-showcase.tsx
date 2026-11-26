import { useEffect, useMemo, useRef, useState } from 'react';
import { getProjectVideoSource } from '../lib/project-video';

export type CinematicProject = {
  id: number;
  title: string;
  category: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  featured: boolean;
  sort_order: number;
};

type Props = {
  projects: CinematicProject[];
  onSelect: (project: CinematicProject) => void;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function ScrollCinematicShowcase({ projects, onSelect }: Props) {
  const items = useMemo(
    () => projects.filter(project => Boolean(project.video_url || project.thumbnail_url)).slice(0, 6),
    [projects],
  );

  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    if (!section || !frame || items.length === 0) return;

    let raf = 0;
    let lastActive = -1;
    let lastProgress = -1;

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
        const p = clamp(-rect.top / scrollable);
        const segment = p * items.length;
        const index = Math.min(items.length - 1, Math.floor(segment));
        const local = clamp(segment - index);

        // The frame begins narrow and skewed, expands to a cinematic 16:9 panel,
        // then eases toward the next shot before the pinned sequence advances.
        const entrance = clamp(local / 0.24);
        const exit = clamp((local - 0.76) / 0.24);
        const scaleX = 0.34 + entrance * 0.66;
        const scaleY = 0.62 + entrance * 0.38;
        const rotateY = 22 * (1 - entrance) - 7 * exit;
        const rotateZ = -3.5 * (1 - entrance);
        const translateX = (1 - entrance) * 10 - exit * 3;

        frame.style.setProperty('--cinematic-scale-x', String(scaleX));
        frame.style.setProperty('--cinematic-scale-y', String(scaleY));
        frame.style.setProperty('--cinematic-rotate-y', `${rotateY}deg`);
        frame.style.setProperty('--cinematic-rotate-z', `${rotateZ}deg`);
        frame.style.setProperty('--cinematic-translate-x', `${translateX}%`);
        frame.style.setProperty('--cinematic-progress', String(p));

        // Crossfade to the next project near the end of each scroll segment.
        // Never fade the final shot out: nothing follows it, so it would leave an empty frame.
        const blend = index < items.length - 1 ? clamp((local - 0.78) / 0.22) : 0;
        mediaRefs.current.forEach((node, i) => {
          if (!node) return;
          const opacity = i === index ? 1 - blend : i === index + 1 ? blend : 0;
          node.style.opacity = String(opacity);
          node.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
          node.style.transform = `scale(${i === index ? 1 + local * 0.035 : 1.06})`;
        });

        if (index !== lastActive) {
          lastActive = index;
          setActiveIndex(index);
          videoRefs.current.forEach((video, i) => {
            if (!video) return;
            if (i === index) {
              video.play().catch(() => undefined);
            } else {
              video.pause();
              try { video.currentTime = 0; } catch { /* metadata may not be ready */ }
            }
          });
        }

        if (Math.abs(p - lastProgress) > 0.002) {
          lastProgress = p;
          setProgress(p);
        }
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      videoRefs.current.forEach(video => video?.pause());
    };
  }, [items]);

  if (!items.length) return null;

  return (
    <section
      ref={sectionRef}
      className="pw-cinematic-section"
      aria-label="Selected Pixel Wrld projects"
      style={{ '--cinematic-count': items.length } as React.CSSProperties}
    >
      <div className="pw-cinematic-sticky">
        <div className="pw-cinematic-topline">
          <span>PIXEL WRLD / SELECTED WORK</span>
          <span>{String(activeIndex + 1).padStart(2, '0')} — {String(items.length).padStart(2, '0')}</span>
        </div>

        <div className="pw-cinematic-copy">
          <p>SCROLL-DRIVEN VISUAL STORIES</p>
          <h3>A FEW GOOD <span>CUTS.</span></h3>
          <span className="pw-cinematic-hint">KEEP SCROLLING TO EXPLORE</span>
        </div>

        <div className="pw-cinematic-perspective">
          <div ref={frameRef} className="pw-cinematic-frame">
            {items.map((project, index) => {
              const source = getProjectVideoSource(project.video_url, { autoplay: false, muted: true });
              return (
                <div
                  key={project.id}
                  ref={node => { mediaRefs.current[index] = node; }}
                  className="pw-cinematic-media"
                  style={{
                    opacity: index === 0 ? 1 : 0,
                    visibility: index === 0 ? 'visible' : 'hidden',
                  }}
                >
                  {source?.kind === 'file' ? (
                    <video
                      ref={node => { videoRefs.current[index] = node; }}
                      src={source.src}
                      poster={project.thumbnail_url || undefined}
                      muted
                      loop
                      playsInline
                      preload={index === 0 ? 'auto' : 'metadata'}
                    />
                  ) : source?.kind === 'embed' ? (
                    <iframe
                      title={`${project.title} video`}
                      src={source.src}
                      loading="lazy"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.title} loading={index < 2 ? 'eager' : 'lazy'} />
                  ) : (
                    <div className="pw-cinematic-placeholder">PIXEL WRLD</div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              className="pw-cinematic-project-link"
              onClick={() => onSelect(items[activeIndex])}
              aria-label={`Open ${items[activeIndex]?.title ?? 'selected project'}`}
            >
              <span>{items[activeIndex]?.category}</span>
              <strong>{items[activeIndex]?.title}</strong>
              <span>OPEN PROJECT ↗</span>
            </button>
          </div>
        </div>

        <div className="pw-cinematic-bottomline">
          <span>SCROLL TO MOVE THROUGH THE FRAME</span>
          <div className="pw-cinematic-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>
    </section>
  );
}

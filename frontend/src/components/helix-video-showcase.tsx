import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { getProjectVideoSource } from '../lib/project-video';

export type ShowcaseProject = {
  id: number;
  title: string;
  category: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  featured: boolean;
  sort_order: number;
};

export function HelixVideoShowcase({ projects, onSelect }: {
  projects: ShowcaseProject[];
  onSelect: (project: ShowcaseProject) => void;
}) {
  // Input is already ordered by the API's featured flag and admin sort order.
  const items = useMemo(() => projects.filter(project => getProjectVideoSource(project.video_url)).slice(0, 6), [projects]);
  const sectionRef = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '100px 0px',
      threshold: 0,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const section = sectionRef.current;
    const orbit = orbitRef.current;
    if (!section || !orbit) return;
    if (reducedMotion) {
      orbit.style.transform = 'rotateX(-8deg) rotateY(-30deg)';
      setActiveIndex(0);
      return;
    }

    let frame = 0;
    const updateRotation = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const travel = window.innerHeight + rect.height;
        const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / travel));
        // One complete turn across the showcase's scroll interval.
        const rotation = -30 + progress * 360;
        orbit.style.transform = `rotateX(-8deg) rotateY(${rotation}deg)`;
        const step = 360 / items.length;
        const nextIndex = ((Math.round(-rotation / step) % items.length) + items.length) % items.length;
        setActiveIndex(current => current === nextIndex ? current : nextIndex);
      });
    };

    updateRotation();
    window.addEventListener('scroll', updateRotation, { passive: true });
    window.addEventListener('resize', updateRotation);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateRotation);
      window.removeEventListener('resize', updateRotation);
    };
  }, [inView, items.length, reducedMotion]);

  if (!items.length) return null;

  return (
    <section ref={sectionRef} className="pw-helix-wrap" aria-label="Featured project videos">
      <div className="pw-helix-heading">
        <p>PIXEL WRLD / SELECTED MOTION</p>
        <h3>STORIES IN <span>MOTION.</span></h3>
        <span className="pw-helix-sub">Scroll to move through selected films</span>
      </div>
      <div className="pw-helix-stage">
        <div ref={orbitRef} className="pw-helix-orbit">
          {items.map((project, index) => {
            const angle = (360 / items.length) * index;
            const active = inView && index === activeIndex;
            const autoplay = active && !reducedMotion;
            const source = getProjectVideoSource(project.video_url, { autoplay, muted: true });
            return (
              <article
                key={project.id}
                className={`pw-helix-card${active ? ' is-active' : ''}`}
                style={{ ['--card-angle' as string]: `${angle}deg` }}
                aria-label={`${project.title}${active ? ', active video' : ', project film'}`}
              >
                <div className="pw-helix-card-media">
                  {active && source?.kind === 'file' ? (
                    <video
                      key={source.src}
                      src={source.src}
                      poster={project.thumbnail_url || undefined}
                      muted
                      loop
                      playsInline
                      autoPlay={autoplay}
                      controls
                      preload="metadata"
                    />
                  ) : active && source?.kind === 'embed' ? (
                    <iframe
                      key={source.src}
                      src={source.src}
                      title={`${project.title} video player`}
                      loading="eager"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" loading="lazy" />
                  ) : (
                    <div className="pw-helix-no-poster" aria-hidden="true">VIDEO</div>
                  )}
                </div>
                <button type="button" className="pw-helix-project-title" onClick={() => onSelect(project)}>
                  <span>{project.category}</span>
                  <strong>{project.title}</strong>
                  <span className="pw-helix-open">OPEN PROJECT ↗</span>
                </button>
              </article>
            );
          })}
        </div>
        <div className="pw-helix-center-mark" aria-hidden="true">PW<span>®</span></div>
      </div>
      <p className="pw-helix-footnote">{items[activeIndex]?.title ?? 'SELECT A FILM'} · SCROLL TO ROTATE</p>
    </section>
  );
}

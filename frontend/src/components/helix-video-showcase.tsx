
import { useEffect, useMemo, useRef, useState } from 'react';
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

type Props = {
  projects: ShowcaseProject[];
  onSelect: (project: ShowcaseProject) => void;
};

export function HelixVideoShowcase({ projects, onSelect }: Props) {
  // Video OR thumbnail projects are allowed in the showcase.
  const items = useMemo(
    () =>
      projects
        .filter(project => project.video_url || project.thumbnail_url)
        .slice(0, 6),
    [projects],
  );

  const sectionRef = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const scrollRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);

  // Detect when the showcase enters the viewport.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '100px 0px', threshold: 0 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  // Automatic continuous rotation + scroll interaction.
  useEffect(() => {
    const orbit = orbitRef.current;
    const section = sectionRef.current;

    if (!orbit || !section || !inView || items.length < 2) return;

    let frame = 0;
    let previousTime = 0;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, window.innerHeight + rect.height);

      const progress = Math.max(
        0,
        Math.min(1, (window.innerHeight - rect.top) / travel),
      );

      // Scrolling adds rotation to the automatic animation.
      scrollRef.current = progress * 180;
    };

    const animate = (time: number) => {
      if (!previousTime) previousTime = time;

      const delta = Math.min(time - previousTime, 40);
      previousTime = time;

      // Automatic rotation speed.
      rotationRef.current += delta * 0.018;

      const rotation = rotationRef.current + scrollRef.current;

      orbit.style.transform =
        `rotateX(-8deg) rotateY(${rotation}deg)`;

      // Determine which card is closest to the front.
      const step = 360 / items.length;
      const normalized = ((rotation % 360) + 360) % 360;

      const nextIndex =
        Math.round(normalized / step) % items.length;

      setActiveIndex(current =>
        current === nextIndex ? current : nextIndex
      );

      frame = requestAnimationFrame(animate);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    window.addEventListener('resize', handleScroll);

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [inView, items.length]);

  // Nothing to show if there are no projects.
  if (!items.length) return null;

  return (
    <section
      ref={sectionRef}
      className="pw-helix-wrap"
      aria-label="Featured project videos"
    >
      <div className="pw-helix-heading">
        <p>PIXEL WRLD / SELECTED MOTION</p>

        <h3>
          STORIES IN <span>MOTION.</span>
        </h3>

        <span className="pw-helix-sub">
          Watch the collection rotate through selected films
        </span>
      </div>

      <div className="pw-helix-stage">
        <div
          ref={orbitRef}
          className="pw-helix-orbit"
        >
          {items.map((project, index) => {
            const angle = (360 / items.length) * index;

            const active =
              inView && index === activeIndex;

            const source = getProjectVideoSource(
              project.video_url,
              {
                autoplay: active,
                muted: true,
              },
            );

            return (
              <article
                key={project.id}
                className={`pw-helix-card${
                  active ? ' is-active' : ''
                }`}
                style={{
                  ['--card-angle' as string]: `${angle}deg`,
                }}
                aria-label={project.title}
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
                      autoPlay
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
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="pw-helix-no-poster">
                      VIDEO
                    </div>
                  )}

                </div>

                <button
                  type="button"
                  className="pw-helix-project-title"
                  onClick={() => onSelect(project)}
                >
                  <span>{project.category}</span>

                  <strong>{project.title}</strong>

                  <span className="pw-helix-open">
                    OPEN PROJECT ↗
                  </span>
                </button>
              </article>
            );
          })}
        </div>

        <div
          className="pw-helix-center-mark"
          aria-hidden="true"
        >
          PW<span>®</span>
        </div>
      </div>

      <p className="pw-helix-footnote">
        {items[activeIndex]?.title ?? 'SELECT A FILM'}
        {' · '}
        AUTO ROTATING / SCROLL TO INTERACT
      </p>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

const rows = [
  { direction: 'left', duration: 42, items: ['Video Editing', 'Reels & Shorts', 'Motion Graphics', '3D Animation', 'Social Media Content'] },
  { direction: 'right', duration: 48, items: ['Brand Films', 'YouTube Editing', 'Commercial Videos', 'Visual Storytelling', 'Creative Direction'] },
  { direction: 'left', duration: 54, items: ['Color Grading', 'Podcast Editing', 'Music Videos', 'Product Films', 'Campaign Content'] },
] as const;

export function ServicePillMarquee() {
  const section = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <section ref={section} id="services" className="service-motion-section" aria-label="Pixel Wrld creative services">
    <div className="service-motion-heading">
      <p className="section-kicker">WHAT WE MAKE / 01</p>
      <h2>Built for the<br/><span>moving image.</span></h2>
      <p>From the first cut to the final frame, we shape content with clarity, rhythm and intent.</p>
    </div>
    <div className={`service-marquee ${inView && !reducedMotion ? 'is-running' : ''}`}>
      {rows.map((row, rowIndex) => <div className={`service-marquee__lane service-marquee__lane--${row.direction}`} key={rowIndex}>
        <div className="service-marquee__track" style={{ '--marquee-duration': `${row.duration}s` } as React.CSSProperties}>
          {[0, 1].map(copy => <div className="service-marquee__set" key={copy} aria-hidden={copy === 1}>
            {row.items.map((label, pillIndex) => <span className={`service-pill ${rowIndex === 1 && pillIndex === 1 ? 'service-pill--accent' : ''}`} key={label}>{label}</span>)}
          </div>)}
        </div>
      </div>)}
    </div>
    <div className="service-motion-foot"><span>EDIT / DESIGN / MOTION</span><span>INDEPENDENT BY NATURE · CREATIVE BY DESIGN</span></div>
  </section>;
}

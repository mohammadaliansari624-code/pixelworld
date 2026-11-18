import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowLeft, ArrowRight, Play, Plus, Trash2, Edit3, LogOut, Settings, Film, Users, LayoutDashboard, Menu, X, Mail, LoaderCircle, Instagram, Facebook, Youtube, MapPin, Phone } from 'lucide-react';
import { GlowCard } from './components/ui/spotlight-card';
import { ServicePillMarquee } from './components/service-pill-marquee';
import { InfiniteCorridor } from './components/infinite-corridor';
import { DEFAULT_BOOKING_MESSAGE, whatsappUrl } from './lib/whatsapp';
import { extractYoutubeVideoId, fetchYoutubeThumbnail, isYoutubeUrl } from './lib/youtube-thumbnail';

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
type Project = { id: number; title: string; category: string; description: string; video_url: string; thumbnail_url: string; featured: boolean; sort_order: number };
type Member = { id: number; name: string; role: string; bio: string; photo_url: string; social_url: string; sort_order: number };
type Site = { id: number; studio_name: string; tagline: string; bio: string; email: string; phone: string; location: string; whatsapp_number: string; booking_message: string; instagram_url: string; facebook_url: string; youtube_url: string; linkedin_url: string; tiktok_url: string; behance_url: string; pinterest_url: string };
const emptySite: Site = { id: 1, studio_name: 'PIXEL WRLD', tagline: 'Stories in motion.', bio: 'An independent creative studio shaping stories frame by frame.', email: '', phone: '', location: '', whatsapp_number: '+919503898739', booking_message: DEFAULT_BOOKING_MESSAGE, instagram_url: '', facebook_url: '', youtube_url: '', linkedin_url: '', tiktok_url: '', behance_url: '', pinterest_url: '' };
const sampleProjects: Project[] = [
  { id: 1, title: 'A Story Worth Keeping', category: 'Wedding', description: 'An intimate story told through movement, music and light.', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200', featured: true, sort_order: 1 },
  { id: 2, title: 'Sound Has A Shape', category: 'Music', description: 'Rhythm translated into moving images.', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200', featured: true, sort_order: 2 },
  { id: 3, title: 'The Art Of Conversation', category: 'Podcast', description: 'A conversation with room to breathe.', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200', featured: false, sort_order: 3 }
];
const sampleTeam: Member[] = [
  { id: 1, name: 'Creative Director', role: 'Direction & Story', bio: 'Building the vision behind every frame.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=700', social_url: '', sort_order: 1 },
  { id: 2, name: 'Lead Editor', role: 'Post-production', bio: 'Finding the rhythm in every story.', photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=700', social_url: '', sort_order: 2 }
];
async function request(path: string, token: string | null = null, options: RequestInit = {}) {
  const url = `${API}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      const timeout = new Error(`Network request to ${url} timed out.`);
      timeout.name = error.name;
      throw timeout;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Network request to ${url} failed: ${reason}`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${path} returned HTTP ${res.status}: ${body.detail || res.statusText || 'Request failed'}`);
  }
  return res.json();
}

const reveal = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } };
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.14 }} transition={{ duration: reduced ? 0 : 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

function ProjectRail({ category, projects, onSelect }: { category: string; projects: Project[]; onSelect: (project: Project) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * Math.max(260, (rail.current?.clientWidth || 900) * .72), behavior: 'smooth' });
  const visible = projects.slice(0, 5);
  return <Reveal className="mb-16 md:mb-20"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="mb-2 text-[9px] tracking-[2.5px] text-[#7EAEFF]">PIXEL WRLD / {category.toUpperCase()}</p><h3 className="text-2xl font-bold tracking-tight md:text-4xl">{category} <span className="font-normal text-white/35">edits</span></h3></div><div className="flex items-center gap-2"><span className="mr-2 hidden text-[10px] tracking-widest text-white/35 sm:block">{visible.length} SELECTED</span><button aria-label={`Scroll ${category} projects left`} onClick={() => move(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 transition hover:border-[#176BFF] hover:bg-[#176BFF]"><ArrowLeft size={15}/></button><button aria-label={`Scroll ${category} projects right`} onClick={() => move(1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 transition hover:border-[#176BFF] hover:bg-[#176BFF]"><ArrowRight size={15}/></button></div></div>
    <div ref={rail} className="pw-project-rail flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>{visible.map((project, i) => <button key={project.id} onClick={() => onSelect(project)} className="group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-md border border-white/10 bg-[#14161b] text-left sm:w-[46%] lg:w-[31.5%] xl:w-[23.8%]"><div className="relative aspect-[4/3] overflow-hidden bg-[#171a20]"><img src={project.thumbnail_url || sampleProjects[i % sampleProjects.length].thumbnail_url} alt={project.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105 group-hover:brightness-75"/><span className="absolute left-3 top-3 bg-black/65 px-2 py-1 text-[9px] tracking-widest text-white/85">{String(i + 1).padStart(2, '0')}</span><span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-black/35 text-white transition group-hover:border-[#176BFF] group-hover:bg-[#176BFF]"><Play size={13} fill="currentColor"/></span></div><div className="p-3 md:p-4"><p className="mb-1 text-[9px] tracking-[1.8px] text-[#7EAEFF]">{project.category.toUpperCase()}</p><h4 className="line-clamp-1 text-sm font-semibold md:text-base">{project.title}</h4><p className="mt-2 line-clamp-2 min-h-8 text-[9px] leading-3.5 text-white/45">{project.description}</p></div></button>)}</div>
    {projects.length > 5 && <p className="mt-1 text-right text-[9px] tracking-widest text-white/35">SCROLL TO EXPLORE · SHOWING 5 FEATURED</p>}</Reveal>;
}

function App() {
  const [data, setData] = useState<{ projects: Project[]; team: Member[]; settings: Site }>({ projects: sampleProjects, team: sampleTeam, settings: emptySite });
  const [modal, setModal] = useState<Project | null>(null); const [booking, setBooking] = useState(false); const [menu, setMenu] = useState(false); const [active, setActive] = useState('work');
  useEffect(() => { request('/api/public').then((result) => setData({ ...result, settings: { ...emptySite, ...result.settings } })).catch(() => {}); }, []);
  useEffect(() => { const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); }), { rootMargin: '-35% 0px -55% 0px' }); document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section)); return () => observer.disconnect(); }, []);
  const categories = Array.from(new Set(data.projects.map(p => p.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const nav = [['work', 'WORK'], ['studio', 'STUDIO'], ['team', 'PEOPLE'], ['contact', 'CONTACT']];
  const closeMenu = () => setMenu(false);
  const bookingLink = whatsappUrl(data.settings.whatsapp_number, 'Hello Pixel Wrld, I am interested in your video editing services. Please share the details.');
  return <div className="min-h-screen overflow-x-hidden bg-[#090a0c] text-[#eeeae2]">
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#090a0c]/90 px-5 py-5 backdrop-blur-xl md:px-10"><a href="#top" className="flex items-center"><img src="/assets/PW%20LOGO(1).png" alt="Pixel Wrld" className="h-9 w-auto object-contain md:h-11"/></a><nav className="hidden gap-8 text-[10px] tracking-[2px] text-white/65 md:flex">{nav.map(([id, label]) => <a key={id} href={`#${id}`} className={`nav-link py-2 transition-colors hover:text-white ${active === id ? 'text-white' : ''}`}>{label}</a>)}</nav><div className="flex items-center gap-4"><button onClick={() => setBooking(true)} className="bg-[#176BFF] px-4 py-3 text-[10px] font-bold tracking-wider hover:bg-white hover:text-black">BOOK A CALL →</button><button className="md:hidden" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div>
      <AnimatePresence>{menu && <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25 }} className="absolute left-0 top-full flex w-full flex-col gap-1 overflow-hidden border-b border-white/10 bg-[#111]/95 p-3 text-xs backdrop-blur-xl md:hidden">{nav.map(([id, label]) => <a key={id} href={`#${id}`} onClick={closeMenu} className="px-4 py-4 tracking-widest hover:bg-white/5">{label}</a>)}</motion.nav>}</AnimatePresence>
    </header>
    <main>
      <section id="top" className="hero relative flex min-h-[600px] items-center justify-center overflow-hidden bg-black px-6 py-24 text-center md:min-h-[720px]"><InfiniteCorridor/><div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/70"/><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .9, ease: [0.22, 1, .36, 1] }} className="relative z-10 mx-auto max-w-3xl"><div className="mx-auto aspect-[5.67/1] w-[min(620px,90vw)] overflow-hidden"><img src="/assets/PIXEL%20WRLD%20FOR%20BACK.png" alt="Pixel Wrld — The world behind great content" className="h-full w-full object-cover object-center"/></div></motion.div></section>
      <div className="overflow-hidden border-y border-white/10 py-4"><div className="animate-[marquee_26s_linear_infinite] whitespace-nowrap text-xs tracking-[4px] text-white/50">STORIES IN MOTION — IMAGES WITH INTENTION — FILMS THAT STAY — STORIES IN MOTION — IMAGES WITH INTENTION — FILMS THAT STAY —</div></div>
      <section id="work" className="scroll-mt-24 px-5 py-20 md:px-10 lg:px-14"><Reveal><div className="mb-12 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-4 text-[10px] tracking-[3px] text-[#7EAEFF]">01 / THE PORTFOLIO</p><h2 className="text-5xl font-black leading-[.88] tracking-[-.08em] md:text-7xl">A FEW GOOD<br/><span className="text-[#176BFF]">CUTS.</span></h2></div><p className="max-w-xs text-xs leading-6 text-white/45">Explore selected work by format. Swipe, drag or use the arrows to move through each collection.</p></div></Reveal>
        {categories.length ? categories.map(category => <ProjectRail key={category} category={category} projects={data.projects.filter(p => p.category.trim() === category).sort((a, b) => a.sort_order - b.sort_order).slice(0, 5)} onSelect={setModal}/>) : <div className="rounded-lg border border-white/10 p-8 text-sm text-white/50">Projects will appear here once they are added from the admin panel.</div>}</section>
      <ServicePillMarquee />
      <section id="studio" className="scroll-mt-24 border-y border-white/10 bg-[#101115] px-6 py-24 md:px-14"><Reveal><div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2"><div><p className="section-kicker mb-6">OUR POINT OF VIEW / 02</p><h2 className="section-heading">NOT JUST<br/>ANOTHER<br/><span>FRAME.</span></h2></div><div className="flex flex-col justify-end"><p className="text-xl font-semibold leading-snug md:text-2xl">The best edits don't announce themselves. They make you feel something.</p><p className="mt-7 text-sm leading-7 text-white/55">{data.settings.bio}</p><div className="mt-9 border-t border-white/15 pt-5 text-[10px] tracking-widest text-white/45">THOUGHTFUL EDITING. UNCOMPROMISING CRAFT.</div></div></div></Reveal></section>
      <section id="team" className="scroll-mt-24 px-6 py-24 md:px-14"><div className="mx-auto max-w-7xl"><Reveal><div className="mb-12"><p className="section-kicker mb-5">THE PEOPLE / 03</p><h2 className="section-heading">GOOD WORK<br/>TAKES <span>PEOPLE.</span></h2></div></Reveal><div className="grid grid-cols-2 gap-5 md:grid-cols-3">{data.team.map((m, i) => <Reveal key={m.id} delay={i * .08}><motion.div whileHover={{ y: -6 }} className="group"><div className="aspect-[3/4] overflow-hidden bg-[#17191e]"><img src={m.photo_url} alt={m.name} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} className="h-full w-full object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0"/></div><h3 className="mt-4 text-lg font-bold">{m.name}</h3><p className="mt-2 text-[10px] tracking-widest text-white/45">{m.role}</p><p className="mt-2 text-xs text-white/55">{m.bio}</p>{m.social_url && <a href={m.social_url} target="_blank" rel="noreferrer" aria-label={`${m.name} social profile`} className="mt-3 inline-block text-white/60 transition hover:-translate-y-1 hover:text-[#7EAEFF]"><Instagram size={16}/></a>}</motion.div></Reveal>)}</div>{data.team.length === 0 && <p className="text-sm text-white/45">Meet the people behind the work soon.</p>}</div></section>
      <section id="contact" className="about-section scroll-mt-24 px-6 py-24 md:px-14"><Reveal><div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_.8fr] md:gap-20"><div><p className="section-kicker mb-6">ABOUT PIXEL WRLD</p><h2 className="about-heading">WE CREATE VISUALS THAT MAKE BRANDS <span>IMPOSSIBLE TO IGNORE.</span></h2></div><div className="flex flex-col justify-center"><p className="text-base leading-7 text-white/70">Pixel Wrld is a creative video editing and visual production agency focused on transforming ideas into engaging visual experiences.</p><p className="mt-7 text-[10px] font-semibold tracking-[.22em] text-[#7EAEFF]">OUR APPROACH</p><p className="mt-3 text-sm leading-7 text-white/55">From the first idea to the final frame, we focus on storytelling, creativity and details that make every project stand out.</p><ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-white/10 pt-6 text-xs text-white/75">{['Professional Video Editing', 'On-Location Video Shoots', 'Motion Graphics', 'Camera Operation', 'YouTube Content', 'Lighting & Setup', 'Social Media Content'].map(service => <li key={service} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#176BFF]"/>{service}</li>)}</ul></div></div><div className="mx-auto mt-14 flex max-w-7xl flex-wrap items-center justify-between gap-5 border-t border-white/10 pt-6 text-xs text-white/50">{data.settings.email && <a href={`mailto:${data.settings.email}`}><Mail className="mr-2 inline" size={14}/>{data.settings.email}</a>}{data.settings.phone && <a href={`tel:${data.settings.phone.replace(/[^+\d]/g, '')}`}><Phone className="mr-2 inline" size={14}/>{data.settings.phone}</a>}{data.settings.location && <span><MapPin className="mr-2 inline" size={14}/>{data.settings.location}</span>}<SocialLinks settings={data.settings}/><a href={bookingLink} target="_blank" rel="noreferrer" className="text-[#7EAEFF] transition hover:text-white">START A PROJECT →</a></div></Reveal></section>
    </main>
    <footer className="flex flex-wrap items-center justify-between gap-5 px-6 py-8 text-[10px] tracking-widest text-white/40 md:px-14"><img src="/assets/PIXEL%20WRLD%20FOR%20BACK(1).png" alt="Pixel Wrld — The world behind great content" className="h-auto w-[min(220px,60vw)] object-contain"/><SocialLinks settings={data.settings}/><span>INDEPENDENT BY NATURE. CREATIVE BY DESIGN.</span><a href="/admin" className="hover:text-white">STUDIO LOGIN →</a></footer>
    <AnimatePresence>{modal && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5" onClick={() => setModal(null)}><motion.div initial={{ y: 20, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10 }} className="w-full max-w-3xl bg-[#171717] p-5" onClick={e => e.stopPropagation()}><div className="mb-4 flex justify-between"><h3 className="text-2xl font-bold">{modal.title}</h3><button aria-label="Close project" onClick={() => setModal(null)}><X/></button></div>{modal.video_url ? <div className="aspect-video"><iframe className="h-full w-full" src={embedUrl(modal.video_url)} title={modal.title} allowFullScreen/></div> : modal.thumbnail_url ? <img src={modal.thumbnail_url} onError={event => { event.currentTarget.style.display = 'none'; }} className="max-h-[60vh] w-full bg-[#171a20] object-cover" alt={modal.title}/> : <div className="grid aspect-video place-items-center bg-[#111] text-white/30"><Film size={40}/></div>}<p className="mt-4 text-sm text-white/60">{modal.description}</p></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{booking && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4" onClick={() => setBooking(false)}><motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="my-8 w-full max-w-xl bg-[#eeeae2] p-6 text-[#171714] md:p-9" onClick={e => e.stopPropagation()}><div className="mb-6 flex items-start justify-between"><div><p className="text-[10px] tracking-widest text-[#b34b3c]">LET'S TALK</p><h3 className="mt-2 text-3xl font-black">START A PROJECT</h3><p className="mt-3 max-w-md text-sm leading-6 text-black/60">Continue in WhatsApp to share your project details and ask about services, pricing, and availability.</p></div><button type="button" aria-label="Close booking details" onClick={() => setBooking(false)}><X/></button></div><a href={bookingLink} target="_blank" rel="noreferrer" onClick={() => setBooking(false)} className="booking-button block bg-[#176BFF] p-4 text-center text-xs font-bold tracking-widest text-white">CONTINUE ON WHATSAPP →</a></motion.div></motion.div>}</AnimatePresence>
  </div>;
}
function SocialLinks({ settings }: { settings: Site }) {
  const platforms = [
    { key: 'instagram_url', label: 'Instagram', url: settings.instagram_url },
    { key: 'facebook_url', label: 'Facebook', url: settings.facebook_url },
    { key: 'youtube_url', label: 'YouTube', url: settings.youtube_url },
    { key: 'linkedin_url', label: 'LinkedIn', url: settings.linkedin_url },
    { key: 'tiktok_url', label: 'TikTok', url: settings.tiktok_url },
    { key: 'behance_url', label: 'Behance', url: settings.behance_url },
    { key: 'pinterest_url', label: 'Pinterest', url: settings.pinterest_url },
  ];
  return <div className="flex items-center gap-4">{platforms.filter(platform => platform.url).map(({ key, label, url }) => <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="text-white/55 transition hover:text-[#7EAEFF]"><SocialIcon platform={label}/></a>)}</div>;
}

function SocialIcon({ platform }: { platform: string }) {
  if (platform === 'Instagram') return <Instagram size={17}/>;
  if (platform === 'Facebook') return <Facebook size={17}/>;
  if (platform === 'YouTube') return <Youtube size={18}/>;
  if (platform === 'LinkedIn') return <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 10H5.67v8h2.67v-8ZM7 6.67a1.55 1.55 0 1 0 0 3.1 1.55 1.55 0 0 0 0-3.1ZM18.33 13.4c0-2.4-1.28-3.52-2.98-3.52a2.58 2.58 0 0 0-2.32 1.28V10h-2.66v8h2.66v-4.2c0-1.1.21-2.17 1.58-2.17 1.35 0 1.37 1.27 1.37 2.24V18h2.35v-4.6Z"/></svg>;
  if (platform === 'TikTok') return <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M19.6 7.1a6.5 6.5 0 0 1-4-1.4v8.1a6.3 6.3 0 1 1-5.5-6.2v3.4a2.9 2.9 0 1 0 2.1 2.8V2.5h3.4c.2 2.1 1.7 3.8 4 4.1v.5Z"/></svg>;
  if (platform === 'Behance') return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 5h7.1c3.3 0 4.9 1.3 4.9 3.7 0 1.5-.8 2.6-2.1 3.1 1.8.4 2.8 1.7 2.8 3.6 0 2.9-2.2 4.6-5.4 4.6H3V5Zm3.4 5.7h3.2c1.3 0 2-.6 2-1.7s-.7-1.6-2-1.6H6.4v3.3Zm0 6.6h3.8c1.4 0 2.2-.7 2.2-1.9s-.8-1.8-2.2-1.8H6.4v3.7ZM17 6h5v2h-5V6Zm6.2 9.1h-6.6c.1 1.6.9 2.4 2.3 2.4.9 0 1.7-.4 1.9-1.1h2.3c-.5 2.3-2.1 3.5-4.4 3.5-2.9 0-4.7-1.9-4.7-4.9 0-3 1.9-5 4.7-5 2.9 0 4.5 2.1 4.5 5.1Zm-6.5-1.7h4.1c-.2-1.2-.9-1.8-2-1.8s-1.9.6-2.1 1.8Z"/></svg>;
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 .1-2.9l1.3-5.4s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.8 0 1.2.6 1.2 1.4 0 .9-.6 2.2-.9 3.5-.3 1 .5 1.8 1.5 1.8 1.8 0 3.1-2.3 3.1-5 0-2.1-1.4-3.7-4-3.7-2.9 0-4.7 2.2-4.7 4.7 0 .9.3 1.6.7 2.1.2.2.2.3.1.5l-.2.8c-.1.2-.3.3-.5.2-1.3-.5-1.9-2-1.9-3.7 0-2.8 2.4-6.1 7.2-6.1 3.8 0 6.3 2.8 6.3 5.8 0 4-2.2 7-5.4 7-1.1 0-2.1-.6-2.5-1.3l-.7 2.8c-.2.8-.7 1.7-1.1 2.4A10 10 0 1 0 12 2Z"/></svg>;
}
function embedUrl(url: string) { if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split(/[?&]/)[0]}`; if (url.includes('youtube.com/watch')) return `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`; if (url.includes('vimeo.com/')) return `https://player.vimeo.com/video/${url.split('vimeo.com/')[1].split(/[?&]/)[0]}`; return url; }

function Admin() {
  const [token, setToken] = useState(localStorage.getItem('pw_token'));
  const [loginBusy, setLoginBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [adminProfile, setAdminProfile] = useState<{ id: number; email: string; is_super_admin: boolean } | null>(null);
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState({ projects: 0, team_members: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<Member[]>([]);
  const [site, setSite] = useState<Site>(emptySite);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const [thumbnailStatus, setThumbnailStatus] = useState('');
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<any[]>([]);
  const [grantEmail, setGrantEmail] = useState('');
  const googleButton = useRef<HTMLDivElement>(null);
  const thumbnailRequest = useRef(0);

  const load = async (authToken = token) => {
    if (!authToken) return;
    const [s, p, t, st] = await Promise.all([request('/api/admin/summary', authToken), request('/api/admin/projects', authToken), request('/api/admin/team', authToken), request('/api/admin/settings', authToken)]);
    setSummary(s); setProjects(p); setTeam(t); setSite({ ...emptySite, ...st });
  };
  const loadAccess = async (authToken = token) => {
    if (!authToken || !adminProfile?.is_super_admin) return;
    const [requests, admins] = await Promise.all([request('/api/admin/access/requests', authToken), request('/api/admin/access/admins', authToken)]);
    setAccessRequests(requests); setAdminAccounts(admins);
  };
  const logout = () => { localStorage.removeItem('pw_token'); setToken(null); setAdminProfile(null); setAccessRequests([]); setAdminAccounts([]); };

  useEffect(() => {
    if (token) {
      request('/api/auth/me', token).then(async profile => { setAdminProfile(profile); await load(token); }).catch(() => logout());
    }
  }, [token]);
  useEffect(() => {
    if (token && adminProfile?.is_super_admin) loadAccess(token).catch((e: any) => setError(e.message));
  }, [token, adminProfile?.is_super_admin]);

  useEffect(() => {
    if (token) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { setAuthMessage('Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to frontend/.env.'); return; }
    let script = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    const render = () => {
      if (!window.google || !googleButton.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async (response: { credential: string }) => {
        setLoginBusy(true); setError(''); setAuthMessage('');
        try {
          const result = await request('/api/auth/google', null, { method: 'POST', body: JSON.stringify({ credential: response.credential }) });
          if (result.status === 'approved' && result.access_token) {
            localStorage.setItem('pw_token', result.access_token); setAdminProfile({ id: 0, email: result.email, is_super_admin: Boolean(result.is_super_admin) }); setToken(result.access_token);
          } else if (result.status === 'pending') setAuthMessage(result.message || 'Access request submitted. Wait for owner approval.');
          else setAuthMessage(result.message || 'Access was not approved. Contact the owner.');
        } catch (e: any) { setError(e.message || 'Google sign-in failed.'); }
        finally { setLoginBusy(false); }
      } });
      googleButton.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButton.current, { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'continue_with', width: 320 });
    };
    if (window.google) render();
    else {
      if (!script) { script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.dataset.googleIdentity = 'true'; document.head.appendChild(script); }
      script.addEventListener('load', render, { once: true });
    }
    return () => { window.google?.accounts.id.cancel(); };
  }, [token]);

  const handleAccessAction = async (id: number, action: 'approve' | 'reject') => {
    try { await request(`/api/admin/access/requests/${id}/${action}`, token, { method: 'POST' }); await loadAccess(); setSuccess(`Access request ${action}d.`); }
    catch (e: any) { setError(e.message); }
  };
  const grantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await request('/api/admin/access/grant', token, { method: 'POST', body: JSON.stringify({ email: grantEmail }) }); setGrantEmail(''); await loadAccess(); setSuccess('Admin access granted.'); }
    catch (e: any) { setError(e.message); }
  };
  const revokeAccess = async (id: number) => {
    if (!confirm('Revoke this admin access?')) return;
    try { await request(`/api/admin/access/admins/${id}/revoke`, token, { method: 'POST' }); await loadAccess(); setSuccess('Admin access revoked.'); }
    catch (e: any) { setError(e.message); }
  };
  const uploadImage = async (file: File, field: 'thumbnail_url' | 'photo_url') => { if (!token) return; setUploading(true); setError(''); try { const form = new FormData(); form.append('file', file); const response = await fetch(`${API}/api/admin/upload-image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }); const result = await response.json(); if (!response.ok) throw new Error(result.detail || 'Image upload failed'); const imageUrl = result.url.startsWith('http') ? result.url : `${API}${result.url}`; setEditing((current: any) => ({ ...current, [field]: imageUrl })); } catch (e: any) { setError(e.message || 'Image upload failed'); } finally { setUploading(false); } };
  const changeProjectVideoUrl = (value: string) => {
    const requestId = ++thumbnailRequest.current;
    const videoId = extractYoutubeVideoId(value);
    setEditing((current: any) => ({ ...current, video_url: value, ...(videoId ? { thumbnail_url: '' } : {}) })); setError('');
    if (!value.trim()) { setThumbnailBusy(false); setThumbnailStatus(''); return; }
    if (!videoId) { setThumbnailBusy(false); setThumbnailStatus(isYoutubeUrl(value) ? 'Enter a valid YouTube watch, short, embed, or youtu.be URL.' : ''); return; }
    setThumbnailBusy(true); setThumbnailStatus('Checking YouTube thumbnail…');
    void fetchYoutubeThumbnail(videoId).then(thumbnailUrl => { if (requestId !== thumbnailRequest.current) return; setEditing((current: any) => current?.video_url === value ? { ...current, thumbnail_url: thumbnailUrl } : current); setThumbnailStatus('YouTube thumbnail loaded.'); }).catch((reason: unknown) => { if (requestId !== thumbnailRequest.current) return; setThumbnailStatus(reason instanceof Error ? reason.message : 'Could not load a YouTube thumbnail.'); }).finally(() => { if (requestId === thumbnailRequest.current) setThumbnailBusy(false); });
  };
  const save = async (kind: 'projects' | 'team', item: any) => { try { const id = item.id; const body = { ...item }; delete body.id; await request(`/api/admin/${kind}${id ? '/' + id : ''}`, token, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) }); setEditing(null); thumbnailRequest.current += 1; setThumbnailBusy(false); setThumbnailStatus(''); await load(); setSuccess('Changes saved.'); } catch (e: any) { setError(e.message); } };
  const del = async (kind: string, id: number) => { if (confirm('Delete this item?')) { await request(`/api/admin/${kind}/${id}`, token, { method: 'DELETE' }); load(); } };
  const saveSite = async (e: React.FormEvent) => { e.preventDefault(); setError(''); setSuccess(''); try { await request('/api/admin/settings', token, { method: 'PUT', body: JSON.stringify(site) }); setSuccess('Contact details and site settings saved.'); await load(); } catch (e: any) { setError(e.message); } };
  const saveSocialLinks = async () => { setError(''); setSuccess(''); try { await request('/api/admin/settings', token, { method: 'PUT', body: JSON.stringify(site) }); setSuccess('Social media links saved.'); await load(); } catch (e: any) { setError(e.message); } };

  if (!token) return <div className="flex min-h-screen items-center justify-center bg-[#090a0c] p-5 text-white"><div className="w-full max-w-md border border-white/15 bg-[#151515] p-8"><p className="text-xs tracking-widest text-[#7EAEFF]">PIXEL WRLD / PRIVATE AREA</p><h1 className="my-5 text-4xl font-black">STUDIO LOGIN</h1><p className="mb-6 text-sm leading-6 text-white/55">Sign in with Google. Only accounts approved by the Pixel Wrld owner can access the admin dashboard.</p><div className="flex min-h-11 justify-center" ref={googleButton}/>{loginBusy && <p className="mt-3 text-center text-xs text-white/45">Verifying Google account…</p>}{error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}{authMessage && <p role="status" className="mt-3 border border-[#176BFF]/40 bg-[#176BFF]/10 p-3 text-sm text-blue-200">{authMessage}</p>}<a href="/" className="mt-6 block text-xs text-white/50">← Back to website</a></div></div>;
  const tabs = [['overview', 'Overview', LayoutDashboard], ['projects', 'Portfolio', Film], ['team', 'Team', Users], ['settings', 'Site settings', Settings], ...(adminProfile?.is_super_admin ? [['access', 'Admin access', Users] as const] : [])] as const;
  const fieldClass = 'mt-2 w-full rounded-sm border border-white/15 bg-white/5 p-3 text-white outline-none transition focus:border-[#176BFF]';
  const contactFields: [keyof Site, string, string][] = [['whatsapp_number', 'WhatsApp number', 'tel'], ['phone', 'Contact phone number', 'tel'], ['email', 'Business email', 'email'], ['location', 'Business address', 'text']];
  const socialFields: [keyof Site, string][] = [['instagram_url', 'Instagram'], ['facebook_url', 'Facebook'], ['youtube_url', 'YouTube'], ['linkedin_url', 'LinkedIn'], ['tiktok_url', 'TikTok'], ['behance_url', 'Behance'], ['pinterest_url', 'Pinterest']];
  return <div className="min-h-screen bg-[#0b0c0f] text-white"><aside className="fixed hidden h-full w-64 border-r border-white/10 bg-[#101114] p-6 md:block"><a href="/" className="block"><img src="/assets/PW%20LOGO(1).png" alt="Pixel Wrld" className="h-10 w-auto"/></a><p className="mb-10 mt-2 text-[9px] tracking-widest text-white/40">STUDIO MANAGEMENT</p>{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => { setTab(id); setEditing(null); setError(''); setSuccess(''); }} className={`mb-2 flex w-full items-center gap-3 p-3 text-left text-xs ${tab === id ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5'}`}><Icon size={16}/>{label}</button>)}<button onClick={logout} className="absolute bottom-8 flex items-center gap-3 text-xs text-white/50"><LogOut size={16}/> Sign out</button></aside><main className="md:ml-64"><header className="flex items-center justify-between border-b border-white/10 px-6 py-5 md:px-10"><div><p className="text-[9px] tracking-widest text-[#7EAEFF]">PIXEL WRLD / ADMIN</p><h1 className="mt-1 text-xl font-bold">{tabs.find(t => t[0] === tab)?.[1]}</h1><p className="mt-1 text-[10px] text-white/40">{adminProfile?.email}</p></div><a href="/" className="text-xs text-white/50">View website →</a></header><div className="p-6 md:p-10">{error && <p role="alert" className="mb-5 text-sm text-red-400">{error}</p>}{success && <p role="status" className="mb-5 text-sm text-emerald-300">{success}</p>}
    {tab === 'overview' && <><div className="grid gap-4 sm:grid-cols-2"><GlowCard customSize className="min-h-36"><Film className="text-[#7EAEFF]"/><p className="mt-5 text-4xl font-bold">{summary.projects}</p><p className="text-xs text-white/50">Portfolio projects</p></GlowCard><GlowCard customSize className="min-h-36"><Users className="text-[#7EAEFF]"/><p className="mt-5 text-4xl font-bold">{summary.team_members}</p><p className="text-xs text-white/50">Team members</p></GlowCard></div><div className="mt-8 border border-white/10 p-6"><h2 className="font-bold">Quick actions</h2><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => setTab('projects')} className="bg-[#176BFF] px-5 py-3 text-xs">Manage portfolio</button><button onClick={() => setTab('team')} className="border border-white/20 px-5 py-3 text-xs">Manage team</button><button onClick={() => setTab('settings')} className="border border-white/20 px-5 py-3 text-xs">Edit contact & bio</button></div></div></>}
    {tab === 'access' && adminProfile?.is_super_admin && <section className="max-w-4xl"><h2 className="text-2xl font-bold">Admin access control</h2><p className="mb-6 mt-2 text-sm text-white/45">Only the owner can approve, grant or revoke admin access. Approved people must use the same Google email.</p><form onSubmit={grantAccess} className="mb-8 flex flex-col gap-3 border border-white/10 p-5 sm:flex-row"><input type="email" required value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="person@gmail.com" className="min-w-0 flex-1 rounded-sm border border-white/15 bg-white/5 p-3 text-sm"/><button className="bg-[#176BFF] px-5 py-3 text-xs font-bold tracking-widest">GRANT ADMIN ACCESS</button></form><h3 className="mb-3 text-lg font-bold">Access requests</h3>{accessRequests.length === 0 && <p className="mb-6 text-sm text-white/40">No access requests yet.</p>}{accessRequests.map(item => <div key={item.id} className="mb-3 flex flex-wrap items-center gap-3 border border-white/10 p-4"><div className="min-w-0 flex-1"><p className="break-all text-sm font-semibold">{item.email}</p><p className="text-xs text-white/45">{item.name || 'Google user'} · {item.status}</p></div>{item.status === 'pending' && <><button onClick={() => handleAccessAction(item.id, 'approve')} className="bg-[#176BFF] px-4 py-2 text-xs">Approve</button><button onClick={() => handleAccessAction(item.id, 'reject')} className="border border-red-400/40 px-4 py-2 text-xs text-red-300">Reject</button></>}</div>)}<h3 className="mb-3 mt-9 text-lg font-bold">Admin accounts</h3>{adminAccounts.map(item => <div key={item.id} className="mb-3 flex flex-wrap items-center gap-3 border border-white/10 p-4"><div className="min-w-0 flex-1"><p className="break-all text-sm font-semibold">{item.email}</p><p className="text-xs text-white/45">{item.is_super_admin ? 'Super admin' : item.is_active ? 'Active admin' : 'Access revoked'}</p></div>{!item.is_super_admin && item.is_active && <button onClick={() => revokeAccess(item.id)} className="border border-red-400/40 px-4 py-2 text-xs text-red-300">Revoke access</button>}</div>)}</section>}
    {tab === 'projects' && <>
      <div className="mb-6 flex justify-between"><h2 className="text-2xl font-bold">Portfolio projects</h2><button onClick={() => { thumbnailRequest.current += 1; setThumbnailBusy(false); setThumbnailStatus(''); setEditing({ title: '', category: 'Wedding', description: '', video_url: '', thumbnail_url: '', featured: false, sort_order: 0 }); }} className="flex items-center gap-2 bg-[#176BFF] px-4 py-3 text-xs"><Plus size={15}/> Add project</button></div>
      {editing && <form onSubmit={e => { e.preventDefault(); if (!thumbnailBusy) save('projects', editing); }} className="mb-7 grid gap-3 border border-white/15 p-5 sm:grid-cols-2">
        {(['title', 'category', 'video_url', 'description'] as const).map(k => <label key={k} className="text-xs">{k === 'video_url' ? 'Video URL' : k === 'title' ? 'Title' : k === 'category' ? 'Category' : 'Description'}<input required={k === 'title'} value={editing[k]} onChange={e => { if (k === 'video_url') changeProjectVideoUrl(e.target.value); else setEditing({ ...editing, [k]: e.target.value }); }} className={fieldClass} placeholder={k === 'video_url' ? 'Paste a YouTube URL or other video URL' : ''}/></label>)}
        <div className="sm:col-span-2 flex min-h-24 items-center gap-4 border-t border-white/10 pt-4">
          <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded bg-[#171a20]"><div className="absolute inset-0 grid place-items-center text-white/25"><Film size={28}/></div>{editing.thumbnail_url && <img key={editing.thumbnail_url} src={editing.thumbnail_url} alt="Project thumbnail preview" onError={event => { event.currentTarget.style.display = 'none'; }} className="relative h-full w-full object-cover"/>}</div>
          <p role={thumbnailBusy ? 'status' : undefined} className="text-xs leading-5 text-white/55">{thumbnailStatus || (editing.thumbnail_url ? 'Project thumbnail preview' : 'A thumbnail preview will appear when available.')}{thumbnailBusy && <LoaderCircle size={14} className="ml-2 inline animate-spin text-blue-300"/>}</p>
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })}/> Featured</label><div className="flex gap-2"><button disabled={thumbnailBusy} className="bg-[#176BFF] px-5 py-3 text-xs disabled:opacity-50">Save</button><button type="button" onClick={() => { thumbnailRequest.current += 1; setEditing(null); setThumbnailBusy(false); setThumbnailStatus(''); setError(''); }} className="border border-white/20 px-5 py-3 text-xs">Cancel</button></div>
      </form>}
      {projects.map(p => <div key={p.id} className="mb-3 flex items-center gap-4 border border-white/10 p-3">{p.thumbnail_url && <img src={p.thumbnail_url} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} className="h-16 w-24 bg-[#171a20] object-cover"/>}<div className="min-w-0 flex-1"><p className="font-semibold">{p.title}</p><p className="text-xs text-white/45">{p.category}</p></div><button aria-label={`Edit ${p.title}`} onClick={() => { thumbnailRequest.current += 1; setThumbnailBusy(false); setThumbnailStatus(''); setEditing(p); }}><Edit3 size={16}/></button><button aria-label={`Delete ${p.title}`} onClick={() => del('projects', p.id)} className="text-red-400"><Trash2 size={16}/></button></div>)}
    </>}
    {tab === 'team' && <><div className="mb-6 flex justify-between"><h2 className="text-2xl font-bold">Team members</h2><button onClick={() => setEditing({ name: '', role: '', bio: '', photo_url: '', social_url: '', sort_order: 0 })} className="flex items-center gap-2 bg-[#176BFF] px-4 py-3 text-xs"><Plus size={15}/> Add member</button></div>{editing && <form onSubmit={e => { e.preventDefault(); save('team', editing); }} className="mb-7 grid gap-3 border border-white/15 p-5 sm:grid-cols-2">{[['name', 'Name'], ['role', 'Role'], ['social_url', 'Social URL'], ['bio', 'Bio']].map(([k, l]) => <label key={k} className="text-xs">{l}<input required={k === 'name'} value={editing[k]} onChange={e => setEditing({ ...editing, [k]: e.target.value })} className={fieldClass}/></label>)}<div className="sm:col-span-2"><label className="block text-xs">Team member profile photo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={e => { const file = e.target.files?.[0]; if (file) uploadImage(file, 'photo_url'); }} className="mt-2 block w-full rounded border border-white/15 bg-white/5 p-3 text-xs file:mr-3 file:border-0 file:bg-[#176BFF] file:px-3 file:py-2 file:text-white"/></label>{uploading && <p className="mt-2 flex items-center gap-2 text-xs text-blue-300"><LoaderCircle size={14} className="animate-spin"/>Uploading image...</p>}{editing.photo_url && <img src={editing.photo_url} alt="Team photo preview" className="mt-3 h-32 w-24 rounded object-cover"/>}</div><div className="flex gap-2"><button className="bg-[#176BFF] px-5 py-3 text-xs">Save</button><button type="button" onClick={() => setEditing(null)} className="border border-white/20 px-5 py-3 text-xs">Cancel</button></div></form>}{team.map(m => <div key={m.id} className="mb-3 flex items-center gap-4 border border-white/10 p-3"><img src={m.photo_url} className="h-16 w-14 object-cover"/><div className="min-w-0 flex-1"><p className="font-semibold">{m.name}</p><p className="text-xs text-white/45">{m.role}</p></div><button aria-label={`Edit ${m.name}`} onClick={() => setEditing(m)}><Edit3 size={16}/></button><button aria-label={`Delete ${m.name}`} onClick={() => del('team', m.id)} className="text-red-400"><Trash2 size={16}/></button></div>)}</>}
    {tab === 'settings' && <form onSubmit={saveSite} className="max-w-4xl"><h2 className="text-2xl font-bold">Contact details</h2><p className="mb-6 mt-2 text-sm text-white/45">These details appear on the public website and are saved to the site settings API.</p><div className="grid gap-4 sm:grid-cols-2">{contactFields.map(([key, label, type]) => <label key={key} className="text-xs">{label}<input type={type} required={key === 'email' ? false : undefined} value={site[key] as string} onChange={e => setSite({ ...site, [key]: e.target.value })} className={fieldClass} placeholder={key === 'whatsapp_number' ? '+919503898739' : ''}/></label>)}<label className="text-xs">Agency name<input value={site.studio_name} onChange={e => setSite({ ...site, studio_name: e.target.value })} className={fieldClass}/></label><label className="text-xs">Tagline<input value={site.tagline} onChange={e => setSite({ ...site, tagline: e.target.value })} className={fieldClass}/></label><label className="text-xs sm:col-span-2">Studio bio<textarea rows={4} value={site.bio} onChange={e => setSite({ ...site, bio: e.target.value })} className={fieldClass}/></label><label className="text-xs sm:col-span-2">WhatsApp booking message<textarea rows={3} value={site.booking_message} onChange={e => setSite({ ...site, booking_message: e.target.value })} className={fieldClass}/></label></div><button className="mt-6 bg-[#176BFF] px-7 py-4 text-xs font-bold tracking-widest">SAVE CHANGES →</button>
      <section className="mt-12 border-t border-white/10 pt-8"><h2 className="text-2xl font-bold">Social Media</h2><p className="mb-6 mt-2 text-sm text-white/45">Add only official Pixel Wrld profile URLs. Leave a field empty to hide that platform from the public site.</p><div className="grid gap-4 sm:grid-cols-2">{socialFields.map(([key, label]) => <div key={key}><label className="block text-xs" htmlFor={key}>{label}</label><div className="mt-2 flex gap-2"><input id={key} type="url" inputMode="url" autoComplete="url" value={site[key] as string} onChange={e => setSite({ ...site, [key]: e.target.value })} className="w-full min-w-0 rounded-sm border border-white/15 bg-white/5 p-3 text-white outline-none transition focus:border-[#176BFF]" placeholder="https://"/><button type="button" onClick={() => setSite({ ...site, [key]: '' })} disabled={!site[key]} className="shrink-0 border border-white/15 px-3 text-xs text-white/60 transition hover:border-white/40 hover:text-white disabled:opacity-30" aria-label={`Clear ${label} URL`}>Clear</button></div></div>)}</div><button type="button" onClick={saveSocialLinks} className="mt-6 bg-[#176BFF] px-7 py-4 text-xs font-bold tracking-widest">SAVE SOCIAL LINKS →</button></section></form>}
  </div></main></div>;
}
export default function Root() { return location.pathname.startsWith('/admin') ? <Admin/> : <App/>; }

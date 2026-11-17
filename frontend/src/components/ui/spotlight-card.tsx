import React,{useEffect,useRef,type ReactNode} from 'react';
import {cn} from '../../lib/utils';
type GlowColor='blue'|'purple'|'green'|'red'|'orange';
interface GlowCardProps{children:ReactNode;className?:string;glowColor?:GlowColor;size?:'sm'|'md'|'lg';width?:string|number;height?:string|number;customSize?:boolean}
const hues:Record<GlowColor,number>={blue:218,purple:280,green:130,red:5,orange:30};
export function GlowCard({children,className='',glowColor='blue',size='md',width,height,customSize=false}:GlowCardProps){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;const move=(e:PointerEvent)=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',`${e.clientX-r.left}px`);el.style.setProperty('--my',`${e.clientY-r.top}px`)};el.addEventListener('pointermove',move);return()=>el.removeEventListener('pointermove',move)},[]);
 const sizes={sm:'min-h-64',md:'min-h-80',lg:'min-h-96'};
 return <div ref={ref} data-spotlight className={cn('relative overflow-hidden rounded-xl border border-white/10 bg-white/[.035] p-5 transition-colors hover:border-white/25',!customSize&&sizes[size],className)} style={{'--glow':hues[glowColor],...(width?{width}:{}),...(height?{height}:{})} as React.CSSProperties}>{children}</div>
}

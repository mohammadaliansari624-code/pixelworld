"use client";
import * as React from "react";
import {motion, type HTMLMotionProps} from "motion/react";
import {cn} from "../../lib/utils";
interface CardStickyProps extends HTMLMotionProps<"div">{index:number;incrementY?:number;incrementZ?:number}
export const ContainerScroll=React.forwardRef<HTMLDivElement,React.HTMLProps<HTMLDivElement>>(({children,className,...props},ref)=><div ref={ref} className={cn("relative w-full",className)} style={{perspective:"1000px",...props.style}} {...props}>{children}</div>);
ContainerScroll.displayName="ContainerScroll";
export const CardSticky=React.forwardRef<HTMLDivElement,CardStickyProps>(({index,incrementY=10,incrementZ=10,children,className,style,...props},ref)=><motion.div ref={ref} layout="position" style={{top:index*incrementY,zIndex:index*incrementZ,backfaceVisibility:"hidden",...style}} className={cn("sticky",className)} {...props}>{children}</motion.div>);
CardSticky.displayName="CardSticky";

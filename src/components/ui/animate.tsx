"use client";

import { cn } from "@/lib/utils";

type AnimateProps = {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms for staggered lists */
  delay?: number;
  as?: "div" | "section" | "span" | "li";
};

/** Soft page / section enter */
export function FadeIn({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: AnimateProps) {
  return (
    <Tag
      className={cn("anim-page-in", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** Pop for menus / dropdown panels (enter only — pair with presence for exit) */
export function PopIn({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: AnimateProps) {
  return (
    <Tag
      className={cn("anim-pop-in", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** Scale for modal panels */
export function ScaleIn({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: AnimateProps) {
  return (
    <Tag
      className={cn("anim-scale-in", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** Wrapper that adds press feedback to children root */
export function Interactive({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("anim-interactive", className)}>{children}</div>;
}

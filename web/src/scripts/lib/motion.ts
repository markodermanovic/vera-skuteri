import { gsap } from 'gsap';

// Jedinstvene vrednosti pokreta za ceo sajt – kratko i diskretno.
export const EASE = 'power2.out';
export const DURATION = { out: 0.15, in: 0.25 } as const;

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export type Cleanup = () => void;

export { gsap };

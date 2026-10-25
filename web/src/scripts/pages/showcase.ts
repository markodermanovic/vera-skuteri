import { gsap, prefersReducedMotion } from '../lib/motion';
import type { PageInit } from './types';

/**
 * Skica → fotografija (components/ShowcaseScooter.astro), po uzoru na NIU M1 dizajnerski prikaz:
 * kad sekcija uđe u ekran, linije se iscrtaju (silueta, tamni delovi, hrom, paneli), pa se fotografija
 * otkrije mekim prelazom sleva nadesno dok skica nestaje. Pušta se jednom.
 */
export const initShowcase: PageInit = ({ container }) => {
  const root = container.querySelector<HTMLElement>('[data-showcase]');
  if (!root || prefersReducedMotion() || !('IntersectionObserver' in window)) return;

  const photo = root.querySelector<HTMLImageElement>('[data-showcase-photo]')!;
  const sketch = root.querySelector<SVGSVGElement>('[data-showcase-sketch]')!;
  const shadow = root.querySelector<HTMLElement>('[data-showcase-shadow]')!;
  const lines = gsap.utils.toArray<SVGPathElement>(sketch.querySelectorAll('path'));
  const group = (k: string) => lines.filter((p) => p.dataset.sk === k);

  let observer: IntersectionObserver | undefined;
  const ctx = gsap.context(() => {
    // Razmak duži od linije – zaobljeni krajevi inače ostave tačku pre iscrtavanja
    lines.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: `${len} ${len + 10}`, strokeDashoffset: len + 5 });
    });
    gsap.set(sketch, { opacity: 1 });
    gsap.set(photo, { '--reveal': '0%', scale: 1.03, transformOrigin: '50% 60%' });
    gsap.set(shadow, { opacity: 0, scaleX: 0.6 });

    const tl = gsap
      .timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
      .to(group('outer'), { strokeDashoffset: 0, duration: 2.2 })
      .to(group('dark'), { strokeDashoffset: 0, duration: 1.4, stagger: 0.1 }, '<0.5')
      .to(group('light'), { strokeDashoffset: 0, duration: 1, stagger: 0.08 }, '<0.4')
      .to(group('panel'), { strokeDashoffset: 0, duration: 0.9, stagger: 0.035 }, '<0.3')
      // Otkrivanje fotografije: meka ivica klizi preko skice, slika se blago "smiri"
      .to(photo, { '--reveal': '125%', duration: 2.2, ease: 'power2.inOut' }, '+=0.5')
      .to(photo, { scale: 1, duration: 2.6, ease: 'power3.out' }, '<')
      .to(sketch, { opacity: 0, duration: 1.4, ease: 'power1.inOut' }, '<0.6')
      .to(shadow, { opacity: 1, scaleX: 1, duration: 1.6, ease: 'power2.out' }, '<');

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        tl.play();
        observer?.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
  }, root);

  return () => {
    observer?.disconnect();
    ctx.revert();
  };
};

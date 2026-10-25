import { prefersReducedMotion, type Cleanup } from '../lib/motion';

/**
 * [data-reveal] elementi ispod prvog ekrana kratko se pojave pri skrolu (CSS tranzicija,
 * IntersectionObserver – bez JS animacija). Sve što je već vidljivo ostaje netaknuto.
 */
export function initReveal(scope: HTMLElement): Cleanup {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return () => {};
  const below = [...scope.querySelectorAll<HTMLElement>('[data-reveal]')].filter(
    (el) => el.getBoundingClientRect().top > innerHeight,
  );
  if (!below.length) return () => {};

  below.forEach((el) => el.classList.add('is-pending'));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      });
    },
    // Ogromna gornja margina: element preskočen brzim skrolom (iznad ekrana) se takođe prikazuje.
    { rootMargin: '100000px 0px -5% 0px' },
  );
  below.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}

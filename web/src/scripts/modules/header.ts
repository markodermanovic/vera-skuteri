import { gsap, prefersReducedMotion } from '../lib/motion';

const nav = () => document.querySelector<HTMLElement>('[data-nav]');

/** "Pilula" ispod aktivnog linka u meniju. */
export function initNav() {
  const el = nav();
  if (!el?.querySelector('[data-nav-pill]')) return;
  el.classList.add('has-pill');
  movePill(false);
  addEventListener('resize', () => movePill(false));
  document.fonts?.ready.then(() => movePill(false));
}

function movePill(animate: boolean) {
  const pill = nav()?.querySelector<HTMLElement>('[data-nav-pill]');
  const active = nav()?.querySelector<HTMLElement>('a[aria-current="page"]');
  if (!pill) return;
  gsap.to(pill, {
    x: active?.offsetLeft ?? 0,
    width: active?.offsetWidth ?? 0,
    autoAlpha: active ? 1 : 0,
    duration: animate && !prefersReducedMotion() ? 0.25 : 0,
    ease: 'power2.inOut',
  });
}

/** Posle navigacije: aktivni link + pomeranje pilule. */
export function updateNav(pathname: string) {
  nav()
    ?.querySelectorAll<HTMLAnchorElement>('a')
    .forEach((a) => {
      const href = a.getAttribute('href')!;
      const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  movePill(true);
}

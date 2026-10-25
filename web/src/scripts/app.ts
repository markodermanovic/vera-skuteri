import barba from '@barba/core';
import type { ITransitionData } from '@barba/core/dist/src/defs';
import { gsap, EASE, DURATION, prefersReducedMotion, type Cleanup } from './lib/motion';
import { syncHead } from './lib/head';
import { initReveal } from './modules/reveal';
import { initCardSlides } from './modules/cardSlides';
import { initNav, updateNav } from './modules/header';
import { pages } from './pages';

let cleanups: Cleanup[] = [];
const scrollPositions = new Map<string, number>();
// Barba tipizira url.href kao opcioni – u praksi je uvek postavljen.
const urlOf = (page: ITransitionData['next']) => new URL(page.url.href ?? location.href);

function mount(container: HTMLElement, namespace: string, url: URL) {
  const page = pages[namespace]?.({ container, url });
  cleanups = [initReveal(container), initCardSlides(container), ...(page ? [page] : [])];
}

function unmount() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
}

function restoreScroll(data: ITransitionData) {
  const isHistory = data.trigger === 'back' || data.trigger === 'forward';
  const hash = urlOf(data.next).hash;
  // 'instant' – inače globalni scroll-behavior: smooth animira skok
  if (isHistory) window.scrollTo({ top: scrollPositions.get(urlOf(data.next).href) ?? 0, behavior: 'instant' });
  else if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'instant' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}

async function fade(el: HTMLElement, to: 0 | 1) {
  if (prefersReducedMotion()) gsap.set(el, { opacity: to });
  else await gsap.to(el, { opacity: to, duration: to ? DURATION.in : DURATION.out, ease: EASE });
}

function start() {
  history.scrollRestoration = 'manual';
  initNav();

  const first = document.querySelector<HTMLElement>('[data-barba="container"]')!;
  mount(first, first.dataset.barbaNamespace ?? '', new URL(location.href));

  // Header i footer stoje – menja se samo sadržaj (<main>) kratkim fade-out / fade-in.
  barba.init({
    timeout: 8000,
    prevent: ({ el, href }) =>
      el.hasAttribute('data-barba-prevent') || new URL(href, location.href).pathname.startsWith('/api/'),
    transitions: [
      {
        name: 'fade',
        leave(data) {
          scrollPositions.set(urlOf(data.current).href, scrollY);
          return fade(data.current.container, 0);
        },
        afterLeave(data) {
          unmount();
          // Barba uklanja stari kontejner tek posle enter-a; sklanjamo ga odmah.
          data.current.container.style.display = 'none';
        },
        beforeEnter(data) {
          syncHead(data.next.html);
          updateNav(urlOf(data.next).pathname);
          restoreScroll(data);
          gsap.set(data.next.container, { opacity: 0 });
          mount(data.next.container, data.next.namespace, urlOf(data.next));
        },
        enter(data) {
          // Pristupačnost: fokus na naslov nove stranice (čitači ekrana ga najave).
          const heading = data.next.container.querySelector<HTMLElement>('h1');
          heading?.setAttribute('tabindex', '-1');
          heading?.focus({ preventScroll: true });
          return fade(data.next.container, 1);
        },
      },
    ],
  });
}

start();

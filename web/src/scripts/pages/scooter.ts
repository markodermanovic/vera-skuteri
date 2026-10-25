import { gsap, prefersReducedMotion } from '../lib/motion';
import { replaceUrl, type PageInit } from './types';

export const initScooter: PageInit = ({ container, url }) => {
  const panels = gsap.utils.toArray<HTMLElement>('.variant-panel', container);
  const inputs = gsap.utils.toArray<HTMLInputElement>('input[name="variant"]', container);
  const nameEl = container.querySelector<HTMLElement>('#variant-name');
  const stockEl = container.querySelector<HTMLElement>('#variant-stock');
  const link = container.querySelector<HTMLAnchorElement>('#inquiry-link');
  let current = panels.find((p) => !p.hidden);

  function select(input: HTMLInputElement, animate: boolean) {
    const name = input.value;
    const inStock = input.dataset.inStock === 'true';
    const next = panels.find((p) => p.dataset.variant === name);

    if (next && next !== current) {
      const prev = current;
      current = next;
      if (animate && prev && !prefersReducedMotion()) {
        gsap.killTweensOf([prev, next]);
        gsap
          .timeline()
          .to(prev, { opacity: 0, duration: 0.12 })
          .add(() => {
            prev.hidden = true;
            gsap.set(prev, { clearProps: 'all' });
            next.hidden = false;
          })
          .fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.2, clearProps: 'all' });
      } else {
        panels.forEach((p) => (p.hidden = p !== next));
      }
    }

    if (nameEl) nameEl.textContent = name;
    if (stockEl) {
      stockEl.dataset.inStock = String(inStock);
      stockEl.querySelector('[data-stock-label]')!.textContent = inStock ? 'Na stanju' : 'Po porudžbini';
    }
    if (link) link.href = `${link.dataset.base}&boja=${encodeURIComponent(name)}`;
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('boja', name);
    replaceUrl(nextUrl);
  }

  const onChange = (e: Event) => select(e.target as HTMLInputElement, true);
  inputs.forEach((i) => i.addEventListener('change', onChange));

  // Deljeni link sa ?boja=... otvara odgovarajuću boju
  const initial = inputs.find((i) => i.value === url.searchParams.get('boja'));
  if (initial) {
    initial.checked = true;
    select(initial, false);
  }

  const onThumb = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.thumb');
    if (!btn) return;
    const panel = btn.closest('.variant-panel')!;
    const main = panel.querySelector<HTMLImageElement>('.main-image')!;
    const swap = () => {
      main.src = btn.dataset.src!;
      main.srcset = btn.dataset.srcset ?? '';
      main.alt = btn.dataset.alt ?? '';
    };
    if (prefersReducedMotion()) swap();
    else gsap.timeline().to(main, { opacity: 0, duration: 0.12 }).add(swap).to(main, { opacity: 1, duration: 0.2 });
    panel.querySelectorAll('.thumb').forEach((t) => t.setAttribute('aria-pressed', String(t === btn)));
  };
  container.addEventListener('click', onThumb);

  return () => {
    inputs.forEach((i) => i.removeEventListener('change', onChange));
    container.removeEventListener('click', onThumb);
  };
};

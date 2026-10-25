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
    // Lightbox se otvara na slici koja je trenutno velika
    panel.querySelector<HTMLElement>('.open-lightbox')!.dataset.lbIndex = btn.dataset.lbIndex;
  };
  container.addEventListener('click', onThumb);

  const closeLightbox = initLightbox(container);

  return () => {
    inputs.forEach((i) => i.removeEventListener('change', onChange));
    container.removeEventListener('click', onThumb);
    closeLightbox();
  };
};

/**
 * Lightbox (#lightbox u [slug].astro): sve slike modela u punoj veličini. Klizač je scroll-snap traka
 * (prevlačenje prstom radi sam), uz strelice, tastaturu i sličice. Zatvara se na Esc, ✕ ili klik van slike.
 */
function initLightbox(container: HTMLElement): () => void {
  const dialog = container.querySelector<HTMLDialogElement>('#lightbox');
  if (!dialog) return () => {};
  const track = dialog.querySelector<HTMLElement>('[data-lb-track]')!;
  const slides = [...track.children] as HTMLElement[];
  const countEl = dialog.querySelector<HTMLElement>('[data-lb-count]')!;
  const colorEl = dialog.querySelector<HTMLElement>('[data-lb-color]')!;
  const thumbs = [...dialog.querySelectorAll<HTMLElement>('[data-lb-go]')];
  let current = 0;

  const go = (i: number, behavior: ScrollBehavior = prefersReducedMotion() ? 'instant' : 'smooth') => {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior });
  };
  const update = () => {
    current = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    countEl.textContent = String(current + 1);
    colorEl.textContent = slides[current]?.dataset.color ?? '';
    thumbs.forEach((t, i) => t.setAttribute('aria-current', String(i === current)));
    // Susedne slike se učitaju unapred
    [current - 1, current + 1].forEach((n) => slides[n]?.querySelector('img')?.setAttribute('loading', 'eager'));
  };

  const onOpen = (e: Event) => {
    const trigger = (e.target as HTMLElement).closest<HTMLElement>('.open-lightbox');
    if (!trigger) return;
    dialog.showModal();
    document.documentElement.classList.add('lightbox-open');
    go(Number(trigger.dataset.lbIndex ?? 0), 'instant');
    update();
  };
  const onClick = (e: Event) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-lb-close]')) return dialog.close();
    if (el.closest('[data-lb-prev]')) return go(current - 1);
    if (el.closest('[data-lb-next]')) return go(current + 1);
    const thumb = el.closest<HTMLElement>('[data-lb-go]');
    if (thumb) return go(Number(thumb.dataset.lbGo));
    // Klik na tamnu pozadinu (ne na sliku ili kontrole) zatvara
    if (el === dialog || el.matches('[data-lb-track] > li')) dialog.close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(current + 1);
    else if (e.key === 'ArrowLeft') go(current - 1);
  };
  const onClose = () => document.documentElement.classList.remove('lightbox-open');
  const onResize = () => dialog.open && go(current, 'instant');

  container.addEventListener('click', onOpen);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('keydown', onKey);
  dialog.addEventListener('close', onClose);
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', onResize);

  return () => {
    if (dialog.open) dialog.close();
    onClose();
    container.removeEventListener('click', onOpen);
    dialog.removeEventListener('click', onClick);
    dialog.removeEventListener('keydown', onKey);
    dialog.removeEventListener('close', onClose);
    track.removeEventListener('scroll', update);
    window.removeEventListener('resize', onResize);
  };
}

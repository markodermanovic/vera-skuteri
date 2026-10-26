import { prefersReducedMotion } from '../lib/motion';
import type { PageInit } from './types';

// Video počinje i završava se crnim kadrom – petlja ih preskače
const LOOP_START = 0.4;
const LOOP_END = 45.7;

/**
 * Hero video (pages/index.astro): bez zvuka, u petlji, sa trakom napretka.
 * Uz reduced-motion ili uštedu podataka ne kreće – ostaje poster.
 * Van ekrana se pauzira da ne troši procesor.
 */
export const initHome: PageInit = ({ container }) => {
  const hero = container.querySelector<HTMLElement>('[data-hero]');
  const video = hero?.querySelector<HTMLVideoElement>('[data-hero-video]');
  if (!hero || !video) return;
  const progress = hero.querySelector<HTMLElement>('[data-hero-progress]')!;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

  const wanted = !prefersReducedMotion() && !saveData;
  let visible = true;

  // Pregledač ponekad odbije automatsko puštanje (npr. tab još nije aktivan) – pokušaj ponovo čim
  // tab postane vidljiv ili korisnik prvi put klikne / tapne / skroluje; nema dugmeta za ručno puštanje
  const RETRY_EVENTS = ['visibilitychange', 'pointerdown', 'keydown', 'scroll'] as const;
  const stopRetry = () => RETRY_EVENTS.forEach((e) => document.removeEventListener(e, retry));
  const retry = () => {
    if (document.visibilityState !== 'visible') return;
    stopRetry();
    sync();
  };
  const sync = () => {
    if (wanted && visible) {
      video.play().catch(() => RETRY_EVENTS.forEach((e) => document.addEventListener(e, retry, { passive: true })));
    } else video.pause();
  };

  // Skok na početak petlje samo jednom po prolazu – ponovljeni skok dok traje prethodni ga nikad ne završi
  const onTime = () => {
    if (video.seeking) return;
    if (video.currentTime >= LOOP_END) video.currentTime = LOOP_START;
    progress.style.transform = `scaleX(${Math.max(0, video.currentTime - LOOP_START) / (LOOP_END - LOOP_START)})`;
  };
  const onMeta = () => {
    if (video.currentTime < LOOP_START) video.currentTime = LOOP_START; // preskoči crni uvodni kadar
  };
  const onEnded = () => {
    video.currentTime = LOOP_START;
    sync();
  };

  video.addEventListener('loadedmetadata', onMeta);
  video.addEventListener('timeupdate', onTime);
  video.addEventListener('ended', onEnded);
  progress.style.transition = 'transform 0.25s linear';

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);

  return () => {
    observer.disconnect();
    stopRetry();
    video.pause();
    video.removeEventListener('loadedmetadata', onMeta);
    video.removeEventListener('timeupdate', onTime);
    video.removeEventListener('ended', onEnded);
  };
};

import { prefersReducedMotion } from '../lib/motion';
import type { PageInit } from './types';

// Video počinje i završava se crnim kadrom – petlja ih preskače
const LOOP_START = 0.4;
const LOOP_END = 45.7;

/**
 * Hero video (pages/index.astro): bez zvuka, u petlji, sa dugmetom za pauzu i trakom napretka.
 * Uz reduced-motion ili uštedu podataka ne kreće sam – ostaje poster i dugme "pusti".
 * Van ekrana se pauzira da ne troši procesor.
 */
export const initHome: PageInit = ({ container }) => {
  const hero = container.querySelector<HTMLElement>('[data-hero]');
  const video = hero?.querySelector<HTMLVideoElement>('[data-hero-video]');
  if (!hero || !video) return;
  const toggle = hero.querySelector<HTMLButtonElement>('[data-hero-toggle]')!;
  const progress = hero.querySelector<HTMLElement>('[data-hero-progress]')!;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

  let wanted = !prefersReducedMotion() && !saveData; // da li korisnik želi da video ide
  let visible = true;

  const render = () => {
    const playing = !video.paused;
    toggle.setAttribute('aria-label', playing ? 'Pauziraj video' : 'Pusti video');
    toggle.querySelector('[data-icon="pause"]')!.classList.toggle('hidden', !playing);
    toggle.querySelector('[data-icon="play"]')!.classList.toggle('hidden', playing);
  };
  const sync = () => {
    if (wanted && visible) {
      video.preload = 'auto';
      video.play().catch(() => {
        wanted = false; // autoplay blokiran – ostaje poster sa dugmetom
        render();
      });
    } else video.pause();
  };

  const onTime = () => {
    if (video.currentTime >= LOOP_END || video.currentTime < LOOP_START) video.currentTime = LOOP_START;
    progress.style.transform = `scaleX(${(video.currentTime - LOOP_START) / (LOOP_END - LOOP_START)})`;
  };
  const onEnded = () => {
    video.currentTime = LOOP_START;
    sync();
  };
  const onToggle = () => {
    wanted = video.paused;
    sync();
  };

  video.addEventListener('timeupdate', onTime);
  video.addEventListener('ended', onEnded);
  video.addEventListener('play', render);
  video.addEventListener('pause', render);
  toggle.addEventListener('click', onToggle);
  toggle.hidden = false;
  progress.style.transition = 'transform 0.25s linear';

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);
  render();

  return () => {
    observer.disconnect();
    video.pause();
    video.removeEventListener('timeupdate', onTime);
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('play', render);
    video.removeEventListener('pause', render);
    toggle.removeEventListener('click', onToggle);
  };
};

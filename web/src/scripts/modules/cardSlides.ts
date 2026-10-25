import { prefersReducedMotion, type Cleanup } from '../lib/motion';

const STEP_MS = 1100;

/**
 * Kartice skutera sa više boja ([data-card-slides]): na hover se slike prevlače kroz sve boje,
 * a aktivna boja se ističe među kružićima. Prelaz mišem preko kružića skače na tu boju.
 * Samo za pravi pokazivač (miš) – na dodir kartica ostaje na prvoj boji.
 */
export function initCardSlides(scope: HTMLElement): Cleanup {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const offs: (() => void)[] = [];

  scope.querySelectorAll<HTMLElement>('[data-card-slides]').forEach((frame) => {
    const card = frame.closest<HTMLElement>('.scooter-card')!;
    const track = frame.querySelector<HTMLElement>('[data-card-track]')!;
    const count = track.children.length;
    const dots = [...card.querySelectorAll<HTMLElement>('[data-card-dot]')];
    let index = 0;
    let timer: number | undefined;

    const show = (i: number) => {
      index = (i + count) % count;
      track.style.transform = `translateX(${-index * 100}%)`;
      dots.forEach((d) => d.classList.toggle('is-active', Number(d.dataset.cardDot) === index));
    };
    const stop = () => window.clearInterval(timer);
    const play = () => {
      stop();
      if (!prefersReducedMotion()) timer = window.setInterval(() => show(index + 1), STEP_MS);
    };
    const onEnter = () => {
      // Slike van okvira su lazy – učitaj ih čim miš priđe kartici
      track.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
      show(index + 1);
      play();
    };
    const onLeave = () => {
      stop();
      show(0);
      dots.forEach((d) => d.classList.remove('is-active'));
    };
    // Kružići su ispod linka preko cele kartice – zato se gleda položaj miša, ne događaji kružića
    const onMove = (e: PointerEvent) => {
      const dot = dots.find((d) => {
        const r = d.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
      const target = dot ? Number(dot.dataset.cardDot) : -1;
      if (target < 0) return;
      stop();
      if (target !== index) show(target);
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);
    card.addEventListener('pointermove', onMove);
    offs.push(() => {
      stop();
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      card.removeEventListener('pointermove', onMove);
    });
  });

  return () => offs.forEach((off) => off());
}

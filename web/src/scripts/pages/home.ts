import { gsap, prefersReducedMotion } from '../lib/motion';
import type { PageInit } from './types';

const INK = '#18181b';

/**
 * Hero skuter (components/HeroScooter.astro), po uzoru na dizajnersku skicu → render:
 * konstrukcione linije → konture → "četkica" rendera → vožnja (točkovi, put, far, energija).
 * SVG je u markupu već gotov render; ovde se vraća na početak i animira. Petlja staje van ekrana.
 */
export const initHome: PageInit = ({ container }) => {
  const svg = container.querySelector<SVGSVGElement>('[data-hero-scooter]');
  if (!svg) return;
  const hero = svg.parentElement!;
  const q = <T extends Element = SVGGeometryElement>(sel: string) => gsap.utils.toArray<T>(svg.querySelectorAll(sel));

  if (prefersReducedMotion()) {
    svg.classList.add('is-ready');
    return () => svg.classList.remove('is-ready');
  }

  // Putanja se "iscrtava" preko dasharray-a; razmak duži od linije da zaobljeni krajevi ne ostave tačku
  const prepDraw = (els: SVGGeometryElement[]) =>
    els.map((el) => {
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: `${len} ${len + 10}`, strokeDashoffset: len + 5 });
      return el;
    });
  const plain = (el: Element) => !el.hasAttribute('stroke-dasharray');

  let observer: IntersectionObserver | undefined;
  const ctx = gsap.context((self) => {
    const sketch = q('[data-hs-sketch] path');
    const lineGroups = q<SVGGElement>('[data-hs-lines]');
    const contours = q('[data-hs-lines] path, [data-hs-lines] circle, [data-hs-lines] rect').filter(plain);
    const tires = q('[data-hs-tire]');
    const energy = q('[data-hs-energy]')[0];
    const energyLen = energy.getTotalLength();

    // Početno stanje: prazno platno, bele linije
    prepDraw(sketch.filter(plain));
    prepDraw(contours);
    gsap.set(q('[data-hs-sketch]'), { opacity: 1 });
    gsap.set(sketch.filter((el) => !plain(el)), { opacity: 0 });
    gsap.set(lineGroups, { color: '#fff' });
    gsap.set(q('[data-hs-reveal]'), { attr: { width: 0 } });
    gsap.set(q('[data-hs-shadow], [data-hs-beam], [data-hs-glow], [data-hs-road], [data-hs-wheel] circle[stroke-dasharray]'), { opacity: 0 });
    gsap.set(energy, { strokeDasharray: `18 ${energyLen}`, strokeDashoffset: 18 });

    const intro = gsap
      .timeline({ delay: 0.2, defaults: { ease: 'power2.inOut' } })
      // 1. Skica
      .to(sketch.filter(plain), { strokeDashoffset: 0, duration: 0.7, stagger: 0.05, ease: 'power1.out' })
      .to(sketch.filter((el) => !plain(el)), { opacity: 1, duration: 0.4 }, '<0.2')
      // 2. Konture
      .to(tires, { strokeDashoffset: 0, duration: 1, stagger: 0.12 }, '-=0.3')
      .to(contours.filter((el) => !tires.includes(el)), { strokeDashoffset: 0, duration: 0.8, stagger: 0.025 }, '<0.15')
      .to(q('[data-hs-road], [data-hs-wheel] circle[stroke-dasharray]'), { opacity: 1, duration: 0.5 }, '<0.3')
      // 3. Render: četkica sleva nadesno, linije prelaze u tamne, skica nestaje
      .to(q('[data-hs-reveal]'), { attr: { width: 640 }, duration: 1.1, ease: 'power3.inOut' }, '-=0.2')
      .to(lineGroups, { color: INK, duration: 0.8, ease: 'power1.inOut' }, '<0.25')
      .to(q('[data-hs-sketch]'), { opacity: 0, duration: 0.6 }, '<')
      .to(q('[data-hs-shadow]'), { opacity: 1, duration: 0.8 }, '<0.2')
      // Far: treptaj pri paljenju, pa snop
      .to(q('[data-hs-glow]'), { keyframes: { opacity: [0, 1, 0.3, 1] }, duration: 0.45, ease: 'none' }, '-=0.3')
      .to(q('[data-hs-beam]'), { opacity: 1, duration: 0.6, ease: 'power2.out' }, '<0.25')
      .add(() => loop.play());

    // 4. Vožnja
    const loop = gsap.timeline({ paused: true });
    q<SVGGElement>('[data-hs-wheel]').forEach((wheel) => {
      const tire = wheel.querySelector<SVGCircleElement>('[data-hs-tire]')!;
      loop.to(
        wheel.querySelector('[data-hs-spokes]'),
        { rotation: 360, svgOrigin: `${tire.getAttribute('cx')} ${tire.getAttribute('cy')}`, duration: 0.9, ease: 'none', repeat: -1 },
        0,
      );
    });
    loop
      .to(q('[data-hs-road]'), { strokeDashoffset: 56, duration: 0.45, ease: 'none', repeat: -1 }, 0)
      .to(q('[data-hs-speed]'), { opacity: 1, duration: 0.6 }, 0)
      .to(q('[data-hs-body]'), { y: -2.5, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
      .to(q('[data-hs-beam]'), { opacity: 0.75, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
      .to(energy, { strokeOpacity: 1, duration: 0.2 }, 0)
      .to(energy, { strokeDashoffset: -energyLen, duration: 1.1, ease: 'power1.in', repeat: -1, repeatDelay: 0.7 }, 0);
    q('[data-hs-speed] path').forEach((line, i) => {
      loop.fromTo(line, { x: 20 }, { x: -110, duration: 0.55 + i * 0.1, ease: 'none', repeat: -1, delay: i * 0.15 }, 0);
    });

    // Blagi paralaks prema mišu (samo uređaji sa pravim pokazivačem)
    if (matchMedia('(pointer: fine)').matches) {
      const toX = gsap.quickTo(svg, 'x', { duration: 0.8, ease: 'power3.out' });
      const toY = gsap.quickTo(svg, 'y', { duration: 0.8, ease: 'power3.out' });
      const toR = gsap.quickTo(svg, 'rotation', { duration: 0.8, ease: 'power3.out' });
      const onMove = (e: PointerEvent) => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        toX(dx * 18);
        toY(dy * 10);
        toR(dx * 1.5);
      };
      const onLeave = () => (toX(0), toY(0), toR(0));
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', onLeave);
      self.add(() => () => {
        hero.removeEventListener('pointermove', onMove);
        hero.removeEventListener('pointerleave', onLeave);
      });
    }

    // Petlja radi samo dok je hero vidljiv
    observer = new IntersectionObserver(([entry]) => {
      if (intro.progress() < 1) return;
      entry.isIntersecting ? loop.play() : loop.pause();
    });
    observer.observe(hero);
  }, svg);

  svg.classList.add('is-ready');
  return () => {
    observer?.disconnect();
    ctx.revert();
    svg.classList.remove('is-ready');
  };
};

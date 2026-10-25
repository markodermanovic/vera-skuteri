import { gsap, prefersReducedMotion } from '../lib/motion';
import { replaceUrl, type PageInit } from './types';

// Flip se učitava samo na katalogu, pri prvom filtriranju.
const loadFlip = () =>
  import('gsap/Flip').then(({ Flip }) => {
    gsap.registerPlugin(Flip);
    return Flip;
  });

export const initCatalog: PageInit = ({ container, url }) => {
  const form = container.querySelector<HTMLFormElement>('#filters');
  const grid = container.querySelector<HTMLElement>('#grid');
  if (!form || !grid) return;
  const cards = [...grid.querySelectorAll<HTMLElement>('.scooter-card')];
  const original = [...cards];
  const count = container.querySelector('#result-count')!;
  const empty = container.querySelector<HTMLElement>('#empty')!;
  const reset = container.querySelector<HTMLButtonElement>('#reset')!;

  // Filteri su u URL-u (npr. /skuteri?kategorija=off-road) da bi se linkovi mogli deliti.
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (el.name && url.searchParams.has(el.name)) el.value = url.searchParams.get(el.name)!;
  }

  const num = (v: string | undefined | null) => (v ? Number(v) : NaN);
  // "cena na upit" ide na kraj u oba smera
  const priceOf = (c: HTMLElement, missing: number) => (isNaN(num(c.dataset.price)) ? missing : num(c.dataset.price));

  async function apply(animate: boolean) {
    const data = new FormData(form!);
    const category = String(data.get('kategorija') ?? '');
    const brand = String(data.get('brend') ?? '');
    const maxPrice = num(String(data.get('cena') ?? ''));
    const minRange = num(String(data.get('domet') ?? ''));
    const sort = String(data.get('sort') ?? '');

    const Flip = animate && !prefersReducedMotion() ? await loadFlip() : null;
    const state = Flip?.getState(cards, { props: 'opacity' });

    let visible = 0;
    for (const card of cards) {
      const price = num(card.dataset.price);
      const show =
        (!category || card.dataset.category === category) &&
        (!brand || card.dataset.brand === brand) &&
        (isNaN(maxPrice) || isNaN(price) || price <= maxPrice) &&
        (isNaN(minRange) || Number(card.dataset.range) >= minRange);
      // style.display (ne [hidden]) – Tailwind postavlja [hidden] sa !important što Flip ne može da animira
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    }

    const sorted = [...original];
    if (sort === 'cena-rastuce') sorted.sort((a, b) => priceOf(a, Infinity) - priceOf(b, Infinity));
    if (sort === 'cena-opadajuce') sorted.sort((a, b) => priceOf(b, -Infinity) - priceOf(a, -Infinity));
    if (sort === 'domet') sorted.sort((a, b) => Number(b.dataset.range) - Number(a.dataset.range));
    if (sort === 'naziv') sorted.sort((a, b) => a.dataset.name!.localeCompare(b.dataset.name!, 'sr'));
    grid!.append(...sorted);

    count.textContent = `${visible} ${visible === 1 ? 'model' : 'modela'}`;
    empty.classList.toggle('hidden', visible > 0);

    if (Flip && state) {
      // Prikazane kartice više ne čekaju reveal pri skrolu
      cards.forEach((c) => c.classList.remove('is-pending'));
      grid!.classList.add('is-flipping');
      Flip.from(state, {
        duration: 0.35,
        ease: 'power2.inOut',
        absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.25 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.15 }),
        onComplete: () => grid!.classList.remove('is-flipping'),
      });
    }

    const next = new URL(location.href);
    next.search = '';
    for (const [k, v] of data) if (v) next.searchParams.set(k, String(v));
    replaceUrl(next);
  }

  const onInput = () => void apply(true);
  const onSubmit = (e: Event) => e.preventDefault();
  const onReset = () => {
    form.reset();
    void apply(true);
  };
  form.addEventListener('input', onInput);
  form.addEventListener('submit', onSubmit);
  reset.addEventListener('click', onReset);
  void apply(false);

  return () => {
    form.removeEventListener('input', onInput);
    form.removeEventListener('submit', onSubmit);
    reset.removeEventListener('click', onReset);
  };
};

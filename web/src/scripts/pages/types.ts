import type { Cleanup } from '../lib/motion';

export interface PageContext {
  container: HTMLElement;
  url: URL;
}

/** Svaka stranica (Barba namespace) izvozi init koji vraća čišćenje – poziva se pri svakom ulasku. */
export type PageInit = (ctx: PageContext) => Cleanup | void;

/** Menja URL bez gubljenja Barba stanja istorije (potrebno za back/forward). */
export function replaceUrl(url: URL | string) {
  history.replaceState(history.state, '', url);
}

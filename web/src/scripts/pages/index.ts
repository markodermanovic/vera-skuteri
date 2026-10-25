import { initCatalog } from './catalog';
import { initScooter } from './scooter';
import { initContact } from './contact';
import { initHome } from './home';
import { initShowcase } from './showcase';
import type { PageInit } from './types';

/** Barba namespace → init funkcija stranice. Stranice bez posebne logike nemaju unos. */
export const pages: Record<string, PageInit> = {
  home: (ctx) => {
    const cleanups = [initHome(ctx), initShowcase(ctx)];
    return () => cleanups.forEach((c) => c?.());
  },
  catalog: initCatalog,
  scooter: initScooter,
  contact: initContact,
};

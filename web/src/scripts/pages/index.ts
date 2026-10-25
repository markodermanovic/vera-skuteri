import { initCatalog } from './catalog';
import { initScooter } from './scooter';
import { initContact } from './contact';
import { initHome } from './home';
import type { PageInit } from './types';

/** Barba namespace → init funkcija stranice. Stranice bez posebne logike nemaju unos. */
export const pages: Record<string, PageInit> = {
  home: initHome,
  catalog: initCatalog,
  scooter: initScooter,
  contact: initContact,
};

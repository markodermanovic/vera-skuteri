// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Potpuno statičan sajt za shared hosting (Apache + PHP): stranice su gotov HTML iz build-a,
  // forma ide na public/api/upit.php. Adresa sajta (sitemap, canonical) dolazi iz SITE_URL pri build-u.
  site: process.env.SITE_URL || 'https://xtreme-motors.xtrememotors.workers.dev',
  trailingSlash: 'never',

  env: {
    schema: {
      // Bez SANITY_PROJECT_ID sajt koristi demo podatke iz src/data/sample-scooters.json
      SANITY_PROJECT_ID: envField.string({ context: 'server', access: 'public', optional: true }),
      SANITY_DATASET: envField.string({ context: 'server', access: 'public', default: 'production' }),
      // Tajne za formu (Resend, Turnstile secret, primalac) nisu ovde – PHP ih čita iz ~/xtreme-config.php
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap({ filter: (page) => !page.includes('/hvala') })]
});

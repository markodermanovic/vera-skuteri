// @ts-check
import { defineConfig, envField } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://xtreme-motors.xtrememotors.workers.dev',
  trailingSlash: 'never',
  // Slike optimizuje Sanity CDN, a sesije nisu potrebne – bez dodatnih Cloudflare binding-a
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,

  env: {
    schema: {
      // Bez SANITY_PROJECT_ID sajt koristi demo podatke iz src/data/sample-scooters.json
      SANITY_PROJECT_ID: envField.string({ context: 'server', access: 'public', optional: true }),
      SANITY_DATASET: envField.string({ context: 'server', access: 'public', default: 'production' }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      INQUIRY_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      INQUIRY_FROM_EMAIL: envField.string({
        context: 'server',
        access: 'public',
        default: 'Xtreme Motors <onboarding@resend.dev>',
      }),
    },
  },

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap({ filter: (page) => !page.includes('/hvala') })]
});

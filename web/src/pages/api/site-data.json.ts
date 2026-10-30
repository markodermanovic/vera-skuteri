import type { APIRoute } from 'astro';
import { getScooters, getSettings } from '../../lib/content';

// Podaci koje forma u PHP-u (public/api/upit.php) koristi za mejlove: nazivi modela i kontakt firme.
// Pravi se pri build-u kao statički fajl, pa uvek odgovara sadržaju iz Sanity-ja u tom build-u.
export const GET: APIRoute = async () => {
  const [scooters, settings] = await Promise.all([getScooters(), getSettings()]);
  return Response.json({
    models: Object.fromEntries(scooters.map((s) => [s.slug, s.name])),
    settings: { companyName: settings.companyName, phone: settings.phone, email: settings.email },
  });
};

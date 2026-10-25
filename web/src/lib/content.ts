// Jedini izvor podataka za stranice. Ako je SANITY_PROJECT_ID podešen čita iz Sanity-ja,
// u suprotnom koristi demo podatke – tako sajt radi i pre povezivanja CMS-a.
import { createClient, type SanityClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import { toHTML } from '@portabletext/to-html';
import { SANITY_PROJECT_ID, SANITY_DATASET } from 'astro:env/server';
import sample from '../data/sample-scooters.json';
import type { Scooter, ScooterImage, SiteSettings, Taxonomy } from './types';

const client: SanityClient | null = SANITY_PROJECT_ID
  ? createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: '2025-10-01',
      useCdn: false, // build-time fetch – uvek najsvežiji objavljeni sadržaj
      perspective: 'published',
    })
  : null;

const imageBuilder = client ? createImageUrlBuilder(client) : null;
const IMAGE_WIDTHS = [480, 800, 1200, 1600];

const scooterProjection = /* groq */ `{
  "id": _id,
  name,
  "slug": slug.current,
  "brand": brand->{name, "slug": slug.current},
  "category": category->{name, "slug": slug.current},
  excerpt,
  description,
  price,
  "priceOnRequest": coalesce(priceOnRequest, false),
  "featured": coalesce(featured, false),
  "mainSpecs": coalesce(mainSpecs, {}),
  "extraSpecs": coalesce(extraSpecs[]{label, value}, []),
  "colorVariants": colorVariants[]{
    name, hex, sku,
    "inStock": coalesce(inStock, true),
    "images": coalesce(images[]{..., "alt": alt, "dimensions": asset->metadata.dimensions, "lqip": asset->metadata.lqip}, [])
  },
  "seo": seo{title, description, ogImage}
}`;

type RawImage = { asset: { _ref: string }; alt?: string; dimensions?: { width: number; height: number }; lqip?: string };
type RawScooter = Omit<Scooter, 'descriptionHtml' | 'colorVariants' | 'seo'> & {
  description?: unknown[];
  colorVariants?: (Omit<Scooter['colorVariants'][number], 'images'> & { images: RawImage[] })[];
  seo?: { title?: string; description?: string; ogImage?: RawImage };
};

function toImage(raw: RawImage, fallbackAlt: string): ScooterImage {
  const b = imageBuilder!.image(raw).auto('format').fit('max');
  const ratio = raw.dimensions ? raw.dimensions.height / raw.dimensions.width : 0.75;
  return {
    src: b.width(1200).url(),
    srcset: IMAGE_WIDTHS.map((w) => `${b.width(w).url()} ${w}w`).join(', '),
    alt: raw.alt || fallbackAlt,
    width: 1200,
    height: Math.round(1200 * ratio),
    lqip: raw.lqip,
  };
}

function normalize(raw: RawScooter): Scooter {
  return {
    ...raw,
    price: raw.price ?? undefined,
    descriptionHtml: raw.description ? toHTML(raw.description as never) : '',
    colorVariants: (raw.colorVariants ?? []).map((v) => ({
      ...v,
      images: v.images.filter((i) => i?.asset).map((i) => toImage(i, `${raw.name} – ${v.name}`)),
    })),
    seo: raw.seo && {
      title: raw.seo.title,
      description: raw.seo.description,
      ogImage: raw.seo.ogImage?.asset ? imageBuilder!.image(raw.seo.ogImage).width(1200).height(630).url() : undefined,
    },
  };
}

// --- Demo podaci -------------------------------------------------------------

const paragraphs = (text: string) =>
  text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`)
    .join('');

function sampleScooters(): Scooter[] {
  const brands = new Map<string, Taxonomy>(sample.brands.map((b) => [b.id, b]));
  const categories = new Map<string, Taxonomy>(sample.categories.map((c) => [c.id, c]));
  return sample.scooters.map((s) => ({
    ...s,
    brand: brands.get(s.brand),
    category: categories.get(s.category),
    price: s.price ?? undefined,
    descriptionHtml: paragraphs(s.description),
    colorVariants: s.colorVariants.map((v) => ({ ...v, images: [] })),
  }));
}

// --- Javni API ---------------------------------------------------------------

let scootersCache: Promise<Scooter[]> | undefined;

export function getScooters(): Promise<Scooter[]> {
  scootersCache ??= client
    ? client
        .fetch<RawScooter[]>(`*[_type == "scooter" && defined(slug.current)] | order(coalesce(order, 999) asc, name asc) ${scooterProjection}`)
        .then((list) => list.map(normalize))
    : Promise.resolve(sampleScooters());
  return scootersCache;
}

export async function getFeaturedScooters(): Promise<Scooter[]> {
  return (await getScooters()).filter((s) => s.featured);
}

export async function getCategories(): Promise<Taxonomy[]> {
  if (!client) return sample.categories;
  return client.fetch(`*[_type == "category"] | order(name asc){name, "slug": slug.current, description}`);
}

export async function getBrands(): Promise<Taxonomy[]> {
  if (!client) return sample.brands;
  return client.fetch(`*[_type == "brand"] | order(name asc){name, "slug": slug.current}`);
}

export async function getSettings(): Promise<SiteSettings> {
  if (!client) return sample.settings;
  const s = await client.fetch<SiteSettings | null>(`*[_id == "siteSettings"][0]{..., "social": coalesce(social, [])}`);
  return s ?? sample.settings;
}

export const isDemoContent = !client;

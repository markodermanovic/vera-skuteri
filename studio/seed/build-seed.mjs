// Generiše seed.ndjson za Sanity iz istih demo podataka koje sajt koristi bez CMS-a.
// Pokretanje: node seed/build-seed.mjs && npm run seed
import {readFileSync, writeFileSync} from 'node:fs'

const data = JSON.parse(readFileSync(new URL('../../web/src/data/sample-scooters.json', import.meta.url), 'utf8'))
const ref = (id) => ({_type: 'reference', _ref: id})
const key = (prefix, i) => `${prefix}${i}`
const blocks = (text) =>
  text.split('\n\n').map((p, i) => ({
    _type: 'block',
    _key: key('b', i),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: key('s', i), text: p, marks: []}],
  }))

const docs = [
  {
    _id: 'siteSettings',
    _type: 'siteSettings',
    ...data.settings,
    otherPhones: (data.settings.otherPhones ?? []).map((o, i) => ({_key: key('p', i), ...o})),
    social: data.settings.social.map((s, i) => ({_key: key('so', i), ...s})),
  },
  ...data.brands.map((b) => ({_id: b.id, _type: 'brand', name: b.name, slug: {_type: 'slug', current: b.slug}})),
  ...data.categories.map((c) => ({_id: c.id, _type: 'category', name: c.name, description: c.description, slug: {_type: 'slug', current: c.slug}})),
  ...data.scooters.map((s) => ({
    _id: s.id,
    _type: 'scooter',
    name: s.name,
    slug: {_type: 'slug', current: s.slug},
    brand: ref(s.brand),
    category: ref(s.category),
    excerpt: s.excerpt,
    description: blocks(s.description),
    price: s.price ?? undefined,
    priceOnRequest: s.priceOnRequest,
    featured: s.featured,
    order: s.order,
    mainSpecs: {_type: 'mainSpecs', ...s.mainSpecs},
    extraSpecs: s.extraSpecs.map((e, i) => ({_type: 'spec', _key: key('e', i), ...e})),
    // Slike se ovde ne uvoze (vidi seed/import-catalog.mjs) – sajt do tada prikazuje ilustraciju u boji varijante.
    colorVariants: s.colorVariants.map(({photos, ...v}, i) => ({_type: 'colorVariant', _key: key('v', i), ...v, images: []})),
  })),
]

writeFileSync(new URL('./seed.ndjson', import.meta.url), docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
console.log(`seed.ndjson: ${docs.length} dokumenata`)

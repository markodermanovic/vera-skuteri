// Uvozi brendove, kategorije i skutere iz web/src/data/sample-scooters.json u Sanity, zajedno sa slikama
// (polje "photos" u svakoj boji: {url} sa interneta ili {file} iz seed/images/).
// Postojeći dokumenti sa istim _id se zamenjuju; sa --prune brišu se skuteri, brendovi i kategorije kojih nema u fajlu,
// a sa --settings se upisuju i kontakt podaci ("settings").
//
// Pokretanje (iz studio/):
//   SANITY_STUDIO_DATASET=development npx sanity exec seed/import-catalog.mjs --with-user-token
//   npx sanity exec seed/import-catalog.mjs --with-user-token -- --prune
import {readFileSync} from 'node:fs'
import {basename} from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-10-01'})
const prune = process.argv.includes('--prune')
const withSettings = process.argv.includes('--settings')
const data = JSON.parse(readFileSync(new URL('../../web/src/data/sample-scooters.json', import.meta.url), 'utf8'))
const ref = (id) => ({_type: 'reference', _ref: id})
const blocks = (text) =>
  text.split('\n\n').map((p, i) => ({
    _type: 'block',
    _key: `b${i}`,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `s${i}`, text: p, marks: []}],
  }))

async function upload(photo) {
  const body = photo.file
    ? readFileSync(new URL(photo.file, import.meta.url))
    : Buffer.from(await (await fetch(photo.url)).arrayBuffer())
  const asset = await client.assets.upload('image', body, {filename: basename(photo.file ?? photo.url)})
  return asset._id
}

console.log(`Dataset: ${client.config().dataset}`)
const tx = client.transaction()

// Kontakt podaci samo na zahtev – inače bi uvoz pregazio izmene iz Studija
if (withSettings) {
  const {social = [], otherPhones = [], ...settings} = data.settings
  tx.createIfNotExists({_id: 'siteSettings', _type: 'siteSettings'}).patch('siteSettings', (p) =>
    p.set({
      ...settings,
      otherPhones: otherPhones.map((o, i) => ({_key: `p${i}`, ...o})),
      social: social.map((s, i) => ({_key: `so${i}`, ...s})),
    }),
  )
  console.log('  podešavanja sajta (kontakt)')
}

for (const b of data.brands) {
  tx.createOrReplace({_id: b.id, _type: 'brand', name: b.name, slug: {_type: 'slug', current: b.slug}})
}
for (const c of data.categories) {
  tx.createOrReplace({_id: c.id, _type: 'category', name: c.name, description: c.description, slug: {_type: 'slug', current: c.slug}})
}

for (const s of data.scooters) {
  const colorVariants = []
  for (const [vi, {photos = [], ...v}] of s.colorVariants.entries()) {
    const images = []
    for (const [pi, photo] of photos.entries()) {
      images.push({
        _type: 'image',
        _key: `i${pi}`,
        asset: ref(await upload(photo)),
        alt: `${s.name} električni skuter – ${v.name.toLowerCase()}`,
      })
    }
    colorVariants.push({_type: 'colorVariant', _key: `v${vi}`, ...v, images})
  }
  tx.createOrReplace({
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
    extraSpecs: s.extraSpecs.map((e, i) => ({_type: 'spec', _key: `e${i}`, ...e})),
    colorVariants,
  })
  console.log(`  ${s.name}: ${colorVariants.map((v) => `${v.name} (${v.images.length})`).join(', ')}`)
}

if (prune) {
  const keep = [...data.scooters, ...data.brands, ...data.categories].map((d) => d.id)
  const stale = await client.fetch(`*[_type in ["scooter", "brand", "category"] && !(_id in path("drafts.**")) && !(_id in $keep)]{_id, _type, name}`, {keep})
  for (const doc of stale) {
    tx.delete(doc._id).delete(`drafts.${doc._id}`)
    console.log(`  briše se ${doc._type}: ${doc.name}`)
  }
}

await tx.commit()
console.log('Gotovo.')

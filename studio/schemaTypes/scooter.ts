import {defineArrayMember, defineField, defineType} from 'sanity'
import {RocketIcon} from '@sanity/icons/Rocket'

export const scooter = defineType({
  name: 'scooter',
  title: 'Skuter',
  type: 'document',
  icon: RocketIcon,
  groups: [
    {name: 'basic', title: 'Osnovno', default: true},
    {name: 'specs', title: 'Specifikacije'},
    {name: 'variants', title: 'Boje'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({name: 'name', title: 'Naziv modela', type: 'string', group: 'basic', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      group: 'basic',
      options: {source: 'name'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'brand', title: 'Brend', type: 'reference', to: [{type: 'brand'}], group: 'basic'}),
    defineField({
      name: 'category',
      title: 'Kategorija',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'basic',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Kratak opis',
      type: 'text',
      rows: 2,
      group: 'basic',
      description: 'Prikazuje se na kartici u katalogu',
      validation: (r) => r.max(180),
    }),
    defineField({
      name: 'description',
      title: 'Opis',
      type: 'array',
      group: 'basic',
      of: [defineArrayMember({type: 'block'})],
    }),
    defineField({
      name: 'priceOnRequest',
      title: 'Cena na upit',
      type: 'boolean',
      group: 'basic',
      initialValue: false,
    }),
    defineField({
      name: 'price',
      title: 'Cena (RSD)',
      type: 'number',
      group: 'basic',
      hidden: ({document}) => Boolean(document?.priceOnRequest),
      validation: (r) =>
        r.min(0).custom((value, {document}) =>
          document?.priceOnRequest || typeof value === 'number' ? true : 'Unesite cenu ili označite "Cena na upit"',
        ),
    }),
    defineField({name: 'featured', title: 'Istaknut na početnoj', type: 'boolean', group: 'basic', initialValue: false}),
    defineField({
      name: 'order',
      title: 'Redosled',
      type: 'number',
      group: 'basic',
      description: 'Manji broj = prikazuje se ranije',
    }),
    defineField({name: 'mainSpecs', title: 'Glavne specifikacije', type: 'mainSpecs', group: 'specs'}),
    defineField({
      name: 'extraSpecs',
      title: 'Dodatne specifikacije',
      type: 'array',
      group: 'specs',
      description: 'Specifikacije koje važe samo za ovaj model (npr. "Svetla": "LED prednje + stop")',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'spec',
          fields: [
            {name: 'label', title: 'Naziv', type: 'string', validation: (r) => r.required()},
            {name: 'value', title: 'Vrednost', type: 'string', validation: (r) => r.required()},
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),
    defineField({
      name: 'colorVariants',
      title: 'Varijante boja',
      type: 'array',
      group: 'variants',
      of: [defineArrayMember({type: 'colorVariant'})],
      validation: (r) => r.required().min(1).error('Dodajte bar jednu boju'),
    }),
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  orderings: [
    {title: 'Redosled', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]},
    {title: 'Naziv', name: 'nameAsc', by: [{field: 'name', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'name', brand: 'brand.name', media: 'colorVariants.0.images.0', variants: 'colorVariants'},
    prepare: ({title, brand, media, variants}) => ({
      title,
      subtitle: [brand, variants?.length ? `${variants.length} boja` : null].filter(Boolean).join(' · '),
      media,
    }),
  },
})

import {defineField, defineType} from 'sanity'

export const colorVariant = defineType({
  name: 'colorVariant',
  title: 'Varijanta boje',
  type: 'object',
  fields: [
    defineField({name: 'name', title: 'Naziv boje', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'hex',
      title: 'HEX kod boje',
      type: 'string',
      description: 'Za prikaz kružića boje, npr. #1a1a1a',
      validation: (r) =>
        r.required().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {name: 'hex'}).error('Unesite HEX, npr. #1a1a1a'),
    }),
    defineField({
      name: 'images',
      title: 'Slike',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alternativni tekst',
              type: 'string',
              validation: (r) => r.required().warning('Opis slike pomaže SEO-u i pristupačnosti'),
            }),
          ],
        },
      ],
      validation: (r) => r.min(1).error('Dodajte bar jednu sliku'),
    }),
    defineField({name: 'inStock', title: 'Na stanju', type: 'boolean', initialValue: true}),
    defineField({name: 'sku', title: 'Šifra (SKU)', type: 'string'}),
  ],
  preview: {
    select: {title: 'name', hex: 'hex', media: 'images.0', inStock: 'inStock'},
    prepare: ({title, hex, media, inStock}) => ({
      title,
      subtitle: `${hex ?? ''}${inStock === false ? ' · nema na stanju' : ''}`,
      media,
    }),
  },
})

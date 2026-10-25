import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons'

export const brand = defineType({
  name: 'brand',
  title: 'Brend',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({name: 'name', title: 'Naziv', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'logo', title: 'Logo', type: 'image'}),
  ],
})

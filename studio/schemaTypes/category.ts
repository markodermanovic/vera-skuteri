import {defineField, defineType} from 'sanity'
import {FolderIcon} from '@sanity/icons/Folder'

export const category = defineType({
  name: 'category',
  title: 'Kategorija',
  type: 'document',
  icon: FolderIcon,
  fields: [
    defineField({name: 'name', title: 'Naziv', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'description', title: 'Opis', type: 'text', rows: 3}),
  ],
})

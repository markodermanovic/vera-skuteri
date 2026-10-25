import {defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({name: 'title', title: 'Meta naslov', type: 'string', validation: (r) => r.max(60)}),
    defineField({name: 'description', title: 'Meta opis', type: 'text', rows: 2, validation: (r) => r.max(160)}),
    defineField({name: 'ogImage', title: 'Slika za deljenje', type: 'image'}),
  ],
})

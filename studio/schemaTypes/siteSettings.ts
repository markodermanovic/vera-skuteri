import {defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Podešavanja sajta',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({name: 'companyName', title: 'Naziv firme', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'phone', title: 'Telefon', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'otherPhones',
      title: 'Ostali telefoni',
      type: 'array',
      description: 'Dodatni brojevi, npr. "Beograd" – 064/8033-929',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'label', title: 'Naziv', type: 'string'},
            {name: 'number', title: 'Broj', type: 'string', validation: (r) => r.required()},
          ],
          preview: {select: {title: 'number', subtitle: 'label'}},
        },
      ],
    }),
    defineField({name: 'email', title: 'Javni email', type: 'string', validation: (r) => r.required().email()}),
    defineField({name: 'address', title: 'Adresa / prodajna mesta', type: 'text', rows: 5, description: 'Svako prodajno mesto u novom redu'}),
    defineField({name: 'workingHours', title: 'Radno vreme', type: 'string'}),
    defineField({
      name: 'social',
      title: 'Društvene mreže',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'label', title: 'Naziv', type: 'string'},
            {name: 'url', title: 'URL', type: 'url'},
          ],
        },
      ],
    }),
  ],
})

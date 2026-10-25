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
    defineField({name: 'email', title: 'Javni email', type: 'string', validation: (r) => r.required().email()}),
    defineField({name: 'address', title: 'Adresa', type: 'text', rows: 2}),
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

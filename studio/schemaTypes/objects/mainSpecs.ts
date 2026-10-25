import {defineField, defineType} from 'sanity'

const num = (name: string, title: string) =>
  defineField({name, title, type: 'number', validation: (r) => r.min(0)})

export const mainSpecs = defineType({
  name: 'mainSpecs',
  title: 'Glavne specifikacije',
  type: 'object',
  options: {columns: 2},
  fields: [
    num('motorPower', 'Snaga motora (W)'),
    num('batteryVoltage', 'Napon baterije (V)'),
    num('batteryCapacity', 'Kapacitet baterije (Ah)'),
    num('range', 'Domet (km)'),
    num('topSpeed', 'Maks. brzina (km/h)'),
    num('weight', 'Težina (kg)'),
    num('maxLoad', 'Maks. opterećenje (kg)'),
    num('chargeTime', 'Vreme punjenja (h)'),
    defineField({name: 'tireSize', title: 'Gume', type: 'string', description: 'npr. 10" vazdušne'}),
    defineField({name: 'brakes', title: 'Kočnice', type: 'string', description: 'npr. disk napred/nazad'}),
    defineField({name: 'ipRating', title: 'Vodootpornost (IP)', type: 'string', description: 'npr. IPX5'}),
  ],
})

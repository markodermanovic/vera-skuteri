import { z } from 'zod';

export const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Unesite ime i prezime').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s/().-]{6,20}$/, 'Unesite ispravan broj telefona'),
  email: z.email('Unesite ispravnu email adresu').trim().max(200),
  model: z.string().trim().min(1, 'Izaberite model'),
  color: z.string().trim().max(60).optional().default(''),
  contactPreference: z.enum(['telefon', 'email']).default('telefon'),
  message: z.string().trim().max(2000).optional().default(''),
  consent: z.literal('on', { error: 'Potrebna je saglasnost za obradu podataka' }),
});

export type Inquiry = z.infer<typeof inquirySchema>;
export type FieldErrors = Partial<Record<keyof Inquiry | 'form', string>>;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { RESEND_API_KEY, INQUIRY_TO_EMAIL, INQUIRY_FROM_EMAIL, TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { inquirySchema, type FieldErrors, type Inquiry } from '../../lib/inquiry';
import { getScooters, getSettings } from '../../lib/content';

export const prerender = false;

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function verifyTurnstile(token: string, ip: string | null) {
  if (!TURNSTILE_SECRET_KEY) return true;
  const body = new FormData();
  body.append('secret', TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

function salesEmail(i: Inquiry, modelName: string) {
  const rows: [string, string][] = [
    ['Model', modelName],
    ['Boja', i.color || '—'],
    ['Ime i prezime', i.name],
    ['Telefon', i.phone],
    ['Email', i.email],
    ['Želi kontakt putem', i.contactPreference === 'telefon' ? 'Telefona' : 'Email-a'],
  ];
  return `
    <h2 style="font-family:sans-serif">Novi upit: ${escape(modelName)}${i.color ? ` (${escape(i.color)})` : ''}</h2>
    <table style="font-family:sans-serif;border-collapse:collapse">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#666">${k}</td><td style="padding:6px 0"><strong>${escape(v)}</strong></td></tr>`).join('')}
    </table>
    ${i.message ? `<p style="font-family:sans-serif;white-space:pre-line;margin-top:16px">${escape(i.message)}</p>` : ''}
    <p style="font-family:sans-serif;margin-top:24px">
      <a href="tel:${escape(i.phone.replace(/[^\d+]/g, ''))}">Pozovi kupca</a> · Odgovorom na ovaj email pišete direktno kupcu.
    </p>`;
}

function customerEmail(i: Inquiry, modelName: string, company: string, phone: string) {
  return `
    <p style="font-family:sans-serif">Poštovani/a ${escape(i.name)},</p>
    <p style="font-family:sans-serif">hvala na interesovanju za <strong>${escape(modelName)}</strong>${i.color ? ` u boji <strong>${escape(i.color)}</strong>` : ''}.
    Primili smo vaš upit i javićemo vam se ${i.contactPreference === 'telefon' ? 'telefonom' : 'mejlom'} u najkraćem roku.</p>
    <p style="font-family:sans-serif">Ako vam je hitno, pozovite nas na ${escape(phone)}.</p>
    <p style="font-family:sans-serif">Srdačan pozdrav,<br>${escape(company)}</p>`;
}

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  const fail = (errors: FieldErrors, status = 400) =>
    wantsJson ? Response.json({ ok: false, errors }, { status }) : redirect('/kontakt?greska=1#forma', 303);
  const succeed = () => (wantsJson ? Response.json({ ok: true }) : redirect('/hvala', 303));

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail({ form: 'Neispravan zahtev.' });
  }

  // Honeypot: ljudi ne vide ovo polje, botovi ga popune – tiho "uspeh"
  if (form.get('website')) return succeed();

  const parsed = inquirySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FieldErrors;
      errors[key] ??= issue.message;
    }
    return fail(errors);
  }
  const inquiry = parsed.data;

  let ip: string | null = null;
  try {
    ip = clientAddress;
  } catch {}
  if (!(await verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), ip))) {
    return fail({ form: 'Provera protiv spama nije uspela. Osvežite stranicu i pokušajte ponovo.' });
  }

  const [scooters, settings] = await Promise.all([getScooters(), getSettings()]);
  const scooter = scooters.find((s) => s.slug === inquiry.model);
  const modelName = scooter?.name ?? (inquiry.model === 'ostalo' ? 'Opšti upit' : inquiry.model);
  const to = INQUIRY_TO_EMAIL || settings.email;

  if (!RESEND_API_KEY) {
    if (import.meta.env.DEV) {
      console.info('[upit] RESEND_API_KEY nije podešen – upit samo ispisan:', { to, modelName, ...inquiry });
      return succeed();
    }
    console.error('[upit] RESEND_API_KEY nije podešen');
    return fail({ form: 'Slanje trenutno nije moguće. Pozovite nas telefonom.' }, 500);
  }

  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: INQUIRY_FROM_EMAIL,
    to,
    replyTo: inquiry.email,
    subject: `Upit: ${modelName}${inquiry.color ? ` – ${inquiry.color}` : ''} (${inquiry.name})`,
    html: salesEmail(inquiry, modelName),
  });
  if (error) {
    console.error('[upit] Resend greška', error);
    return fail({ form: 'Došlo je do greške pri slanju. Pokušajte ponovo ili nas pozovite.' }, 502);
  }

  // Potvrda kupcu – neuspeh ne obara upit jer je prodaja već obaveštena
  const confirmation = await resend.emails.send({
    from: INQUIRY_FROM_EMAIL,
    to: inquiry.email,
    replyTo: settings.email,
    subject: `Primili smo vaš upit – ${modelName}`,
    html: customerEmail(inquiry, modelName, settings.companyName, settings.phone),
  });
  if (confirmation.error) console.warn('[upit] potvrda kupcu nije poslata', confirmation.error);

  return succeed();
};

# Acko Skuteri

Katalog električnih skutera sa formom za upit (bez online plaćanja).

| Deo | Tehnologija |
|---|---|
| Sajt | Astro 7 (statičke stranice) + Tailwind 4 |
| CMS | Sanity Studio (`studio/`) |
| Hosting | Cloudflare Workers (statički fajlovi + jedan endpoint `/api/upit`) |
| Email | Resend |
| Zaštita od spama | Cloudflare Turnstile + honeypot + Zod validacija |

## Lokalni razvoj

Potreban je Node 24 (`nvm use` – verzija je u `.nvmrc`).

```bash
npm install
cp web/.env.example web/.env   # već sadrži Turnstile TEST ključeve
npm run dev                    # http://localhost:4321
```

Bez `SANITY_PROJECT_ID` sajt koristi demo podatke iz `web/src/data/sample-scooters.json`.
Bez `RESEND_API_KEY` upiti se u dev modu samo ispisuju u konzolu.

## Povezivanje Sanity-ja

1. `cd studio && npx sanity init --env` – kreira projekat i upisuje `SANITY_STUDIO_PROJECT_ID` u `studio/.env`.
2. Uvezi demo sadržaj: `node seed/build-seed.mjs && npm run seed`.
3. `npm run studio` (lokalno) ili `npm run deploy -w studio` → `https://<ime>.sanity.studio` za urednike.
4. U `web/.env` upiši isti `SANITY_PROJECT_ID`.
5. U Studiju dodaj fotografije za svaku boju – dok ih nema, sajt prikazuje ilustraciju u boji varijante.

## Animacije i tranzicije

Namerno jednostavno i brzo: Barba.js menja samo sadržaj (`<main>`) kratkim fade-out (0.15s) / fade-in (0.25s),
header i footer stoje. GSAP (core) radi te fade-ove, pilulu u meniju i promenu boje; Flip se lenjo učitava
samo za filtriranje kataloga. Otkrivanje pri skrolu je čist CSS + IntersectionObserver.

| Fajl | Uloga |
|---|---|
| `web/src/scripts/app.ts` | Barba init, fade tranzicija, mount/unmount stranica, skrol, fokus |
| `web/src/scripts/lib/motion.ts` | zajednički easing/trajanja, reduced-motion |
| `web/src/scripts/modules/reveal.ts` | `data-reveal` – elementi ispod prvog ekrana se pojave pri skrolu |
| `web/src/scripts/modules/header.ts` | "pilula" aktivnog linka u meniju |
| `web/src/scripts/pages/*.ts` | logika po stranici (Barba namespace iz `<Layout namespace>`) |

Pravila:
- **Bez `<script>` u stranicama** – Barba ih ne bi ponovo izvršio. Logika ide u `scripts/pages/<namespace>.ts` i vraća cleanup funkciju.
- **Bez `<style>` u stranicama** – stilovi idu u `global.css`.
- Linkovi koje Barba ne treba da preuzme dobijaju `data-barba-prevent`.
- Sadržaj prvog ekrana se nikad ne skriva; `prefers-reduced-motion` gasi sve animacije.

## Struktura sadržaja

- **Skuter**: naziv, brend, kategorija, cena ili „cena na upit“, glavne specifikacije (fiksna polja), dodatne specifikacije (slobodni parovi naziv/vrednost), varijante boja (naziv, HEX, slike, na stanju, SKU), SEO.
- **Brend**, **Kategorija**, **Podešavanja sajta** (telefon, email, adresa, radno vreme, mreže).

## Deploy (Cloudflare)

```bash
cd web
npx wrangler login
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put INQUIRY_TO_EMAIL
npm run build && npx wrangler deploy
```

Javne promenljive (`SANITY_PROJECT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`, `INQUIRY_FROM_EMAIL`) moraju biti dostupne pri build-u
(Cloudflare → Workers Builds → Build variables), a tajne kao Worker secrets.

Preporučeno: povezati GitHub repo u Cloudflare Workers Builds (automatski deploy na push na `main`, preview za PR).

### Automatski rebuild posle objave u CMS-u

1. Cloudflare → Worker → Settings → Builds → **Deploy hook** → kopiraj URL.
2. sanity.io/manage → API → **Webhooks** → novi webhook na taj URL, filter `_type in ["scooter","brand","category","siteSettings"]`, okidači create/update/delete.

Urednik objavi izmenu → sajt je ažuriran za ~1 minut.

### Resend

Verifikuj domen (SPF/DKIM DNS zapisi) da bi `INQUIRY_FROM_EMAIL` sa tvog domena stizao u inbox, a ne u spam.

## Pre puštanja u rad

- [ ] Pravi Turnstile ključevi (Cloudflare → Turnstile) umesto test ključeva
- [ ] Domen u `web/astro.config.mjs` (`site`) i u Cloudflare-u
- [ ] Pravnik da pregleda `/politika-privatnosti`
- [ ] Prave fotografije i podaci u Sanity-ju

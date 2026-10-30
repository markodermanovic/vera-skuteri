# Xtreme Motors

Katalog električnih skutera sa formom za upit (bez online plaćanja).

| Deo | Tehnologija |
|---|---|
| Sajt | Astro 7 (statičke stranice) + Tailwind 4 |
| CMS | Sanity Studio (`studio/`) |
| Hosting | Shared hosting (Apache + PHP): statičke stranice + `api/upit.php` za formu |
| Email | Resend |
| Zaštita od spama | Cloudflare Turnstile + honeypot + provera polja u PHP-u |

## Lokalni razvoj

Potreban je Node 24 (`nvm use` – verzija je u `.nvmrc`).

```bash
npm install
cp web/.env.example web/.env   # već sadrži Turnstile TEST ključeve
npm run dev                    # http://localhost:4321
```

`npm run dev` čita Sanity dataset **development** (probni sadržaj), a `npm run dev:live -w web` čita **production** (sadržaj sa sajta).
Bez `SANITY_PROJECT_ID` sajt koristi podatke iz `web/src/data/sample-scooters.json`.

### Katalog: prvo lokalno, pa na sajt

Modeli, cene, specifikacije i izvori slika su u `web/src/data/sample-scooters.json` (slike: `photos` – URL ili fajl iz `studio/seed/images/`).

```bash
cd studio
SANITY_STUDIO_DATASET=development npx sanity exec seed/import-catalog.mjs --with-user-token -- --prune   # proba lokalno (npm run dev)
npx sanity exec seed/import-catalog.mjs --with-user-token -- --prune                                    # objava na sajt (production)
```

`--prune` briše skutere, brendove i kategorije kojih nema u fajlu; `--settings` upisuje i kontakt podatke iz `settings` (inače se ne diraju, da se ne pregaze izmene iz Studija). Objava u production pokreće webhook i novi build (~1–2 min).

Forma se obrađuje u PHP-u (`web/public/api/upit.php`), pa u `npm run dev` slanje ne radi – testira se na hostingu (ili lokalnim PHP serverom nad `web/dist`).

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

## Kako sajt radi

1. Sadržaj (modeli, cene, slike, kontakt) se uređuje u Sanity Studiju i čuva u Sanity-ju (projekat `g8e3xhkc`, dataset `production`).
2. `npm run build` pokreće Astro: `web/src/lib/content.ts` tada čita Sanity i od svake stranice pravi gotov HTML u `web/dist`.
   Slike ostaju na `cdn.sanity.io` (u HTML-u su samo linkovi). Posle build-a sajt više ne zavisi od Sanity API-ja.
3. `web/dist` se otpremi na hosting. Jedini serverski deo je forma: `/api/upit` → `api/upit.php` (Resend + Turnstile),
   koja čita nazive modela iz `api/site-data.json` (pravi se u istom build-u).
4. Zato svaka objava u Studiju traži novi build + otpremanje – ručno ili automatski (GitHub Actions).

## Deploy na shared hosting (cPanel, PHP 8.1+)

**Jednom na hostingu:**

1. Domen/poddomen + SSL (cPanel → SSL/TLS Status → AutoSSL).
2. `hosting/xtreme-config.example.php` kopiraj kao **`xtreme-config.php` u home folder naloga – pored `public_html`, ne unutar njega** – i upiši ključeve (Resend, primalac, Turnstile secret).
3. Za automatski deploy: poseban FTP nalog ograničen na `public_html` (cPanel → FTP Accounts), preko SFTP-a ako hosting daje SSH, inače FTPS.

**Ručno (A):**

```bash
SITE_URL=https://xtreme.rs npm run build      # pravi web/dist sa podacima iz Sanity-ja (production)
```

Zatim sadržaj `web/dist` (uključujući skriveni `.htaccess`) otpremi u `public_html` (FileZilla, „Overwrite“).

**Automatski (B) – `.github/workflows/deploy.yml`:** push na `main`, objava u Sanity-ju ili dugme „Run workflow“ → build → `lftp mirror` na hosting.

1. GitHub → repo → Settings → Secrets and variables → Actions
   - **Secrets:** `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PASSWORD`, `DEPLOY_DIR` (npr. `public_html`)
   - **Variables:** `DEPLOY_PROTOCOL` (`sftp`/`ftps`), `DEPLOY_PORT` (`22`/`21`), `SANITY_PROJECT_ID` (`g8e3xhkc`), `SANITY_DATASET` (`production`), `SITE_URL`, `PUBLIC_TURNSTILE_SITE_KEY`
2. GitHub → Settings (profil) → Developer settings → **Fine-grained token**: samo ovaj repo, dozvola **Contents: Read and write** (potrebna za `repository_dispatch`), rok važenja godinu dana.
3. sanity.io/manage → API → Webhooks → webhook (isti filter `_type in ["scooter","brand","category","siteSettings"]`):
   - URL: `https://api.github.com/repos/markodermanovic/vera-skuteri/dispatches`, metoda POST
   - HTTP headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`
   - Projection: `{"event_type": "sanity-publish"}`

Ključevi za mejl nikad ne idu na GitHub – samo u `xtreme-config.php` na serveru.

### Resend

Verifikuj domen (SPF/DKIM DNS zapisi kod hostinga) i u `xtreme-config.php` promeni `INQUIRY_FROM_EMAIL` na adresu sa tog domena – tek tada kupci dobijaju potvrdu na svoj mejl.

## Pre puštanja u rad

- [ ] Pravi Turnstile ključevi (Cloudflare → Turnstile) umesto test ključeva
- [ ] Domen u `SITE_URL` (build) i SSL na hostingu
- [ ] Pravnik da pregleda `/politika-privatnosti`
- [ ] Prave fotografije i podaci u Sanity-ju

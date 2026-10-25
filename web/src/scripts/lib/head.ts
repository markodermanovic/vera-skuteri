// Barba menja samo [data-barba="container"]; meta podatke u <head> usklađujemo ručno.
const SYNCED = [
  'meta[name="description"]',
  'meta[name="robots"]',
  'link[rel="canonical"]',
  'meta[property^="og:"]',
  'script[type="application/ld+json"]',
].join(',');

export function syncHead(nextHtml: string) {
  const next = new DOMParser().parseFromString(nextHtml, 'text/html');
  document.title = next.title;
  document.head.querySelectorAll(SYNCED).forEach((el) => el.remove());
  next.head.querySelectorAll(SYNCED).forEach((el) => document.head.append(el.cloneNode(true)));
}

// Turnstile se učitava "explicit" režimom jer se kontakt stranica može otvoriti i kroz Barba tranziciju.
interface Turnstile {
  render(el: HTMLElement, options: { sitekey: string; language?: string }): string;
  reset(id?: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | undefined;

export function loadTurnstile(): Promise<Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve(window.turnstile!);
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Turnstile nije učitan'));
    };
    document.head.append(script);
  });
  return loading;
}

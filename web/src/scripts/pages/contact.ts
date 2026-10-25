import barba from '@barba/core';
import { PUBLIC_TURNSTILE_SITE_KEY } from 'astro:env/client';
import { loadTurnstile } from '../lib/turnstile';
import type { PageInit } from './types';

export const initContact: PageInit = ({ container, url }) => {
  const form = container.querySelector<HTMLFormElement>('#forma');
  if (!form) return;
  const model = form.querySelector<HTMLSelectElement>('#model')!;
  const color = form.querySelector<HTMLSelectElement>('#color')!;
  const formError = form.querySelector<HTMLElement>('#form-error')!;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const colors: Record<string, string[]> = JSON.parse(container.querySelector('#colors-by-model')!.textContent!);
  let disposed = false;

  // --- Turnstile (explicit render, radi i posle Barba tranzicije) ---
  let widgetId: string | undefined;
  const widgetEl = form.querySelector<HTMLElement>('[data-turnstile]');
  if (widgetEl && PUBLIC_TURNSTILE_SITE_KEY) {
    loadTurnstile()
      .then((t) => {
        if (!disposed) widgetId = t.render(widgetEl, { sitekey: PUBLIC_TURNSTILE_SITE_KEY!, language: 'sr' });
      })
      .catch(() => showFormError('Zaštita od spama nije učitana. Osvežite stranicu.'));
  }

  // --- Boje zavise od izabranog modela ---
  function fillColors(selected?: string | null) {
    const list = colors[model.value] ?? [];
    color.replaceChildren(new Option(list.length ? 'Bilo koja' : model.value ? '—' : 'Prvo izaberite model', ''));
    list.forEach((c) => color.add(new Option(c, c, false, c === selected)));
    color.disabled = list.length === 0;
  }
  const onModel = () => fillColors();
  model.addEventListener('change', onModel);

  // Popunjavanje iz linka sa stranice modela: /kontakt?model=slug&boja=Naziv
  const preset = url.searchParams.get('model');
  if (preset && [...model.options].some((o) => o.value === preset)) model.value = preset;
  fillColors(url.searchParams.get('boja'));
  if (url.searchParams.has('greska')) showFormError('Proverite unete podatke i pokušajte ponovo.');

  function showFormError(msg: string) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
  }

  function showErrors(errors: Record<string, string>) {
    const invalid: Element[] = [];
    form!.querySelectorAll<HTMLElement>('.error').forEach((el) => {
      const msg = errors[el.dataset.for!] ?? '';
      el.textContent = msg;
      const input = form!.querySelector(`[name="${el.dataset.for}"]`);
      if (msg && input) {
        input.setAttribute('aria-invalid', 'true');
        invalid.push(input);
      } else input?.removeAttribute('aria-invalid');
    });
    if (errors.form) showFormError(errors.form);
    else formError.classList.add('hidden');
    (invalid[0] as HTMLElement | undefined)?.focus();
  }

  function setBusy(busy: boolean) {
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  }

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json' } });
      const data = (await res.json()) as { ok: boolean; errors?: Record<string, string> };
      if (data.ok) {
        barba.go('/hvala');
        return;
      }
      showErrors(data.errors ?? { form: 'Došlo je do greške.' });
      if (widgetId) window.turnstile?.reset(widgetId);
    } catch {
      showErrors({ form: 'Nema konekcije. Pokušajte ponovo ili nas pozovite.' });
    }
    setBusy(false);
  };
  form.addEventListener('submit', onSubmit);

  return () => {
    disposed = true;
    model.removeEventListener('change', onModel);
    form.removeEventListener('submit', onSubmit);
    if (widgetId) window.turnstile?.remove(widgetId);
  };
};

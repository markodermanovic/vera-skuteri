import type { MainSpecs, Scooter } from './types';

const rsd = new Intl.NumberFormat('sr-Latn-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 });

export const formatPrice = (s: Pick<Scooter, 'price' | 'priceOnRequest'>) =>
  s.priceOnRequest || s.price == null ? 'Cena na upit' : rsd.format(s.price);

const n = (v: number) => v.toLocaleString('sr-Latn-RS');

// Redosled i format prikaza glavnih specifikacija – prazna polja se preskaču.
export function specRows(spec: MainSpecs): { label: string; value: string }[] {
  const battery =
    spec.batteryVoltage && spec.batteryCapacity
      ? `${spec.batteryVoltage} V / ${n(spec.batteryCapacity)} Ah (${n(Math.round(spec.batteryVoltage * spec.batteryCapacity))} Wh)`
      : undefined;
  const rows: [string, string | undefined][] = [
    ['Snaga motora', spec.motorPower ? `${n(spec.motorPower)} W` : undefined],
    ['Baterija', battery],
    ['Domet', spec.range ? `do ${n(spec.range)} km` : undefined],
    ['Maks. brzina', spec.topSpeed ? `${n(spec.topSpeed)} km/h` : undefined],
    ['Težina', spec.weight ? `${n(spec.weight)} kg` : undefined],
    ['Maks. opterećenje', spec.maxLoad ? `${n(spec.maxLoad)} kg` : undefined],
    ['Vreme punjenja', spec.chargeTime ? `${n(spec.chargeTime)} h` : undefined],
    ['Gume', spec.tireSize],
    ['Kočnice', spec.brakes],
    ['Vodootpornost', spec.ipRating],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1])).map(([label, value]) => ({ label, value }));
}

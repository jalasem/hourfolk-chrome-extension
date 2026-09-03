/** Node-side Intl helpers mirroring the extension's formatting, used to compute expectations. */
export function partsIn(epochMs: number, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(epochMs)).map((x) => [x.type, x.value]));
  return { year: +p.year!, month: +p.month!, day: +p.day!, hour: +p.hour! % 24, minute: +p.minute!, second: +p.second! };
}

export function isoDateIn(epochMs: number, timeZone: string): string {
  const { year, month, day } = partsIn(epochMs, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Epoch ms for a wall-clock time in a zone (unique times only; good enough for expectations). */
export function instantFor(isoDate: string, isoTime: string, timeZone: string): number {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const [hh, mm] = isoTime.split(':').map(Number) as [number, number];
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 3; i += 1) {
    const p = partsIn(guess, timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const diff = Date.UTC(y, m - 1, d, hh, mm) - asUtc;
    if (diff === 0) break;
    guess += diff;
  }
  return guess;
}

export function time12(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(epochMs)).replace(/\s/g, ' ');
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, d)));
}

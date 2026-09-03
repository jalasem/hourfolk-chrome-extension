/** "in 5 days", "in 2 hours", "in 3 minutes", "now", "2 hours ago". */
export function formatRelative(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return 'now';
  let value: number;
  let unit: string;
  if (minutes < 60) {
    value = minutes;
    unit = 'minute';
  } else if (minutes < 60 * 36) {
    value = Math.round(minutes / 60);
    unit = 'hour';
  } else {
    value = Math.round(minutes / (60 * 24));
    unit = 'day';
  }
  const text = `${value} ${unit}${value === 1 ? '' : 's'}`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

/** A more precise two-unit distance for planning, such as "in 2 hours 15 minutes". */
export function formatRelativeDuration(targetMs: number, nowMs: number): string {
  const diff = targetMs - nowMs;
  const totalMinutes = Math.round(Math.abs(diff) / 60_000);
  if (totalMinutes < 1) return 'now';

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const values = [
    { value: days, unit: 'day' },
    { value: hours, unit: 'hour' },
    { value: minutes, unit: 'minute' },
  ].filter(({ value }) => value > 0).slice(0, 2);
  const text = values.map(({ value, unit }) => `${value} ${unit}${value === 1 ? '' : 's'}`).join(' ');
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

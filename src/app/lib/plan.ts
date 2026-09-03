import type { SavedCity } from '@/domain/storage/schema';
import { describeInstant } from '@/domain/time/format';
import { dayRelation } from '@/domain/time/relations';
import type { DayRelation, HourCycle, IanaTimeZone, InstantDescription } from '@/domain/time/types';
import { abbreviationFallback, type LocalLocation } from './local';

export interface PlanRow {
  key: string;
  name: string;
  location: string;
  timeZone: IanaTimeZone;
  role: 'local' | 'source' | 'saved';
  description: InstantDescription;
  /** Relation of this row's calendar date to the user's current local date. */
  relation: DayRelation;
}

export interface PlanSourceInfo {
  timeZone: IanaTimeZone;
  cityLabel: string;
  cityLocation: string;
}

interface BuildPlanRowsInput {
  epochMs: number;
  nowMs: number;
  local: LocalLocation;
  source: PlanSourceInfo;
  cities: SavedCity[];
  hourCycle: HourCycle;
  locale?: string;
}

export function buildPlanRows({ epochMs, nowMs, local, source, cities, hourCycle, locale }: BuildPlanRowsInput): PlanRow[] {
  const describe = (zone: IanaTimeZone) => describeInstant(epochMs, zone, { hourCycle, abbreviationFallback, ...(locale ? { locale } : {}) });
  const relate = (zone: IanaTimeZone) => dayRelation(epochMs, zone, local.timeZone, nowMs);

  const rows: PlanRow[] = [
    {
      key: 'local',
      name: local.name,
      location: local.known ? `${local.detail} · You` : `${local.detail} · You`,
      timeZone: local.timeZone,
      role: 'local',
      description: describe(local.timeZone),
      relation: relate(local.timeZone),
    },
  ];

  const sourceSaved = cities.some((c) => c.timeZone === source.timeZone && (c.label ?? c.name) === source.cityLabel);
  if (!sourceSaved) {
    rows.push({
      key: 'source',
      name: source.cityLabel,
      location: source.cityLocation,
      timeZone: source.timeZone,
      role: 'source',
      description: describe(source.timeZone),
      relation: relate(source.timeZone),
    });
  }

  for (const city of cities) {
    rows.push({
      key: city.id,
      name: city.label ?? city.name,
      location: [city.region, city.country].filter(Boolean).join(', '),
      timeZone: city.timeZone,
      role: 'saved',
      description: describe(city.timeZone),
      relation: relate(city.timeZone),
    });
  }
  return rows;
}

/** Plain-text summary suitable for email or chat. */
export function formatPlanForCopy(rows: PlanRow[], source: PlanSourceInfo, epochMs: number, hourCycle: HourCycle): string {
  const src = describeInstant(epochMs, source.timeZone, { hourCycle, abbreviationFallback });
  const ascii = (s: string) => s.replace(/−/g, '-');
  const lines = [`${src.time} in ${source.cityLabel} · ${src.weekday}, ${src.date} (${ascii(src.utcOffset)})`, ''];
  const width = Math.max(...rows.map((r) => (r.role === 'local' ? `${r.name} (you)` : r.name).length));
  for (const row of rows) {
    const label = row.role === 'local' ? `${row.name} (you)` : row.name;
    const d = row.description;
    lines.push(`${label.padEnd(width)}  ${d.time.padStart(hourCycle === '12h' ? 8 : 5)}  ${d.weekdayShort}, ${d.date}  ${ascii(d.utcOffset)}`);
  }
  return lines.join('\n');
}

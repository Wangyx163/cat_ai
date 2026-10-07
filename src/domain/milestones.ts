import { addDays, diffDays, monthKey, parseISO, toISO, type ISODate } from './dates';
import type { Pet, State } from './types';

const MARKS = [1, 30, 100, 200, 365, 500, 730, 1000];
export interface Milestone { key: string; title: string; date: ISODate; kind: 'home' | 'birthday' }

export const daysHome = (pet: Pet, today: ISODate) => diffDays(today, pet.adoptedAt);

/** 自动里程碑：到家第 N 天、生日 */
export function milestones(pet: Pet, today: ISODate): Milestone[] {
  const out: Milestone[] = [];
  for (const d of MARKS) {
    const date = addDays(pet.adoptedAt, d);
    if (diffDays(today, date) >= 0) out.push({ key: `home-${d}`, title: `到家 ${d} 天`, date, kind: 'home' });
  }
  if (pet.birthday) {
    const b = parseISO(pet.birthday);
    for (let y = b.getFullYear() + 1; y <= parseISO(today).getFullYear(); y++) {
      const date = toISO(new Date(y, b.getMonth(), b.getDate()));
      if (diffDays(today, date) >= 0) out.push({ key: `bd-${y}`, title: `${y - b.getFullYear()} 岁生日`, date, kind: 'birthday' });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface Stats { weightFrom?: number; weightTo?: number; dewormOnTime: number; sunnyDays: number; dailyCount: number; careCount: number }

/** 时间段统计，用于里程碑卡、月度报告和分享卡片 */
export function statsBetween(s: State, petId: string, from: ISODate, to: ISODate): Stats {
  const ev = s.events.filter((e) => e.petId === petId && e.date >= from && e.date <= to);
  const w = ev.filter((e) => e.type === 'weight' && e.data?.kg !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  return {
    weightFrom: w[0]?.data?.kg, weightTo: w[w.length - 1]?.data?.kg,
    dewormOnTime: ev.filter((e) => e.type === 'care' && e.data?.onTime && (e.data.kind === 'deworm_in' || e.data.kind === 'deworm_out')).length,
    sunnyDays: s.sunnyDays[petId] ?? 0,
    dailyCount: ev.filter((e) => e.type === 'daily').length,
    careCount: ev.filter((e) => e.type === 'care').length,
  };
}

export function lastMonthKey(today: ISODate): string {
  const d = parseISO(today);
  return monthKey(toISO(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
}

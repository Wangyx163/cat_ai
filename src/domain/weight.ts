import { diffDays, type ISODate } from './dates';

export interface WeightPoint { date: ISODate; kg: number }
export interface Trend { anomaly: boolean; changePct?: number; from?: number; to?: number; last?: number; prev?: number }

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 体重趋势：近 windowDays 天内变化超过 thresholdPct% 视为「变化明显」，只提示咨询兽医，不做诊断 */
export function weightTrend(points: WeightPoint[], today: ISODate, windowDays = 28, thresholdPct = 5): Trend {
  const pts = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const last = pts[pts.length - 1];
  if (!last) return { anomaly: false };
  const prev = pts.length > 1 ? pts[pts.length - 2].kg : undefined;
  const inWin = pts.filter((p) => diffDays(today, p.date) <= windowDays);
  const first = inWin[0];
  if (!first || first === last) return { anomaly: false, last: last.kg, prev };
  const changePct = ((last.kg - first.kg) / first.kg) * 100;
  return { anomaly: Math.abs(changePct) >= thresholdPct, changePct: r1(changePct), from: first.kg, to: last.kg, last: last.kg, prev };
}

/** 抱宠称重：抱着一起称 − 只称自己 */
export function heldWeight(withPet: number, alone: number): number | null {
  if (!(withPet > 0 && alone > 0) || withPet <= alone || withPet - alone > 100) return null;
  return r1(withPet - alone);
}

export function inRange(kg: number, range?: [number, number]): boolean | undefined {
  return range ? kg >= range[0] && kg <= range[1] : undefined;
}

/** 连续按时称重次数：相邻两次间隔不超过「周期 + 2 天」 */
export function weighStreak(points: WeightPoint[], intervalDays: number, today: ISODate): number {
  const pts = [...points].sort((a, b) => b.date.localeCompare(a.date));
  if (!pts.length || diffDays(today, pts[0].date) > intervalDays + 2) return 0;
  let n = 1;
  for (let i = 1; i < pts.length; i++) {
    if (diffDays(pts[i - 1].date, pts[i].date) <= intervalDays + 2) n++;
    else break;
  }
  return n;
}

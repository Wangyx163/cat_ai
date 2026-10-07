import { distanceKm } from './geo';
import type { Candidate, Size, WalkProfile } from './types';

const IDX: Record<Size, number> = { S: 0, M: 1, L: 2 };
const ENERGY: Record<string, number> = { 精力旺盛: 2, 社牛: 2, 爱追逐: 2, 慢热: 0, 温柔: 0, 怕生: 0, 黏人: 1, 好奇: 1 };
const energy = (t: string[]) => (t.length ? t.reduce((s, x) => s + (ENERGY[x] ?? 1), 0) / t.length : 1);

export const temperFit = (a: string[], b: string[]) => 1 - Math.abs(energy(a) - energy(b)) / 2;
export const slotOverlap = (a: string[], b: string[]) => a.filter((s) => b.includes(s));

/** 过滤：3 公里内 · 双方疫苗（凭证或自述）· 发情期暂停 · 任一方怕大狗时体型只差 1 档以内 */
export function eligible(me: WalkProfile, myVaccineOk: boolean, c: Candidate, km: number): boolean {
  if (!myVaccineOk || c.vaccine === 'none') return false;
  if (me.inHeat || c.inHeat) return false;
  if (km > 3) return false;
  if ((me.scaredOfBig || c.scaredOfBig) && Math.abs(IDX[me.size] - IDX[c.size]) > 1) return false;
  return true;
}

/** 排序：共同时段 40% + 性格契合 30% + 体型接近 20% + 距离 10% */
export function matchScore(me: WalkProfile, c: Candidate, km: number): number {
  const ov = slotOverlap(me.slots, c.slots).length;
  const s = 40 * (me.slots.length ? ov / me.slots.length : 0) + 30 * temperFit(me.temper, c.temper)
    + 20 * (1 - Math.abs(IDX[me.size] - IDX[c.size]) / 2) + 10 * Math.max(0, 1 - km / 3);
  return Math.round(s);
}

export interface Ranked { c: Candidate; score: number; km: number; overlap: string[] }
export function rankCandidates(me: WalkProfile, myVaccineOk: boolean, myHash: string, list: Candidate[], exclude: Set<string>): Ranked[] {
  return list
    .filter((c) => !exclude.has(c.id))
    .map((c) => ({ c, km: distanceKm(myHash, c.geohash) }))
    .filter(({ c, km }) => eligible(me, myVaccineOk, c, km))
    .map(({ c, km }) => ({ c, km, score: matchScore(me, c, km), overlap: slotOverlap(me.slots, c.slots) }))
    .sort((a, b) => b.score - a.score);
}

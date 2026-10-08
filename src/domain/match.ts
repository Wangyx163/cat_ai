import { distanceKm } from './geo';
import type { Size, WalkEvent, WalkProfile } from './types';

/** 遛狗局：帮狗狗找合适的玩伴——多人、公共地点、固定时段；不做一对一约见 */
export const VIBES = ['新手友好', '幼犬社交', '大狗撒欢', '安静慢遛'];
export const SIZE_NAME: Record<Size, string> = { S: '小型', M: '中型', L: '大型' };
const ENERGY: Record<string, number> = { 精力旺盛: 2, 社牛: 2, 爱追逐: 2, 慢热: 0, 温柔: 0, 怕生: 0, 黏人: 1, 好奇: 1 };
const VIBE_ENERGY: Record<string, number> = { 新手友好: 1, 幼犬社交: 1.5, 大狗撒欢: 2, 安静慢遛: 0 };
const energy = (t: string[]) => (t.length ? t.reduce((s, x) => s + (ENERGY[x] ?? 1), 0) / t.length : 1);

export const vibeFit = (temper: string[], vibe: string) => 1 - Math.abs(energy(temper) - (VIBE_ENERGY[vibe] ?? 1)) / 2;
export const sizesText = (sizes: Size[]) => (sizes.length === 3 ? '不限体型' : `${sizes.map((s) => SIZE_NAME[s]).join('、')}犬`);

/** 过滤：3 公里内 · 双方疫苗（凭证或自述）· 发情期暂停 · 体型在局的范围内 · 怕大狗时避开有大型犬的局 · 局未满员 */
export function eventEligible(me: WalkProfile, myVaccineOk: boolean, e: WalkEvent, km: number): boolean {
  if (!myVaccineOk || me.inHeat) return false;
  if (km > 3) return false;
  if (!e.sizes.includes(me.size)) return false;
  if (me.scaredOfBig && me.size !== 'L' && e.sizes.includes('L')) return false;
  return e.dogs.length < e.capacity;
}

/** 排序：时段吻合 40% + 氛围与性格契合 30% + 距离 20% + 局的规模 10% */
export function eventScore(me: WalkProfile, e: WalkEvent, km: number): number {
  const slot = me.slots.includes(e.slot) ? 1 : 0;
  const scale = e.dogs.length >= 2 && e.dogs.length <= 6 ? 1 : 0.5;
  return Math.round(40 * slot + 30 * vibeFit(me.temper, e.vibe) + 20 * Math.max(0, 1 - km / 3) + 10 * scale);
}

export interface RankedEvent { e: WalkEvent; score: number; km: number }
export function rankEvents(me: WalkProfile, myVaccineOk: boolean, myHash: string, events: WalkEvent[], hiddenHosts: Set<string>): RankedEvent[] {
  return events
    .filter((e) => !e.joined && !e.mine && !hiddenHosts.has(e.host))
    .map((e) => ({ e, km: distanceKm(myHash, e.geohash) }))
    .filter(({ e, km }) => eventEligible(me, myVaccineOk, e, km))
    .map(({ e, km }) => ({ e, km, score: eventScore(me, e, km) }))
    .sort((a, b) => b.score - a.score);
}

import { addDays, monthsBetween, type ISODate } from './dates';
import type { Plan, PlanKind, Species } from './types';

export type Stage = 'baby' | 'adult' | 'senior';
export interface ProductOpt { label: string; days: number }
export interface TemplateItem {
  kind: PlanKind; title: string; period: string; intervalDays: number; defaultOn: boolean; askLast: boolean; icon: string; products?: ProductOpt[];
}

export function stageOf(birthday: ISODate | undefined, today: ISODate): Stage {
  if (!birthday) return 'adult';
  const months = monthsBetween(birthday, today);
  return months < 12 ? 'baby' : months >= 84 ? 'senior' : 'adult';
}
export const STAGE_NAME: Record<Stage, string> = { baby: '幼年', adult: '成年', senior: '老年' };

/** 计划模板：周期都是默认值，可逐项修改，以兽医医嘱为准 */
export function templateFor(species: Species, stage: Stage): TemplateItem[] {
  const baby = stage === 'baby';
  return [
    { kind: 'deworm_in', title: '体内驱虫', period: baby ? '幼年按兽医建议加密' : '约 3 个月', intervalDays: baby ? 30 : 90, defaultOn: true, askLast: true, icon: 'pill',
      products: [{ label: '片剂 · 约 3 个月', days: 90 }, { label: '滴剂 · 约 1 个月', days: 30 }, { label: '不确定', days: baby ? 30 : 90 }] },
    { kind: 'deworm_out', title: '体外驱虫', period: '依产品 · 常见每月', intervalDays: 30, defaultOn: true, askLast: true, icon: 'shield',
      products: [{ label: '滴剂 · 约 1 个月', days: 30 }, { label: '口服 · 约 3 个月', days: 90 }, { label: '不确定', days: 30 }] },
    { kind: 'vaccine_core', title: '核心疫苗', period: baby ? '按免疫程序' : '按兽医建议加强', intervalDays: 365, defaultOn: true, askLast: true, icon: 'syringe' },
    { kind: 'vaccine_rabies', title: '狂犬疫苗', period: species === 'dog' ? '按当地规定（养犬为法定要求）' : '按当地规定', intervalDays: 365, defaultOn: true, askLast: true, icon: 'syringe' },
    { kind: 'weigh', title: '称体重', period: baby ? '每周' : '每月', intervalDays: baby ? 7 : 30, defaultOn: true, askLast: false, icon: 'scale' },
    { kind: 'checkup', title: '体检', period: stage === 'senior' ? '每半年' : '每年', intervalDays: stage === 'senior' ? 180 : 365, defaultOn: true, askLast: true, icon: 'calendar' },
    { kind: 'nails', title: '剪指甲', period: '每 2 周', intervalDays: 14, defaultOn: false, askLast: false, icon: 'paw' },
    { kind: 'teeth', title: '刷牙', period: '每天', intervalDays: 1, defaultOn: false, askLast: false, icon: 'tooth' },
  ];
}

export const LAST_BUCKETS: { label: string; daysAgo: number | null }[] = [
  { label: '今天', daysAgo: 0 }, { label: '一周内', daysAgo: 3 }, { label: '一个月内', daysAgo: 15 },
  { label: '三个月内', daysAgo: 45 }, { label: '不记得了', daysAgo: null },
];

export interface PlanPick { kind: PlanKind; last?: number; product?: number }

/** 把点选结果变成计划：不记得 → 护盾「待确认」；不需要问上次的项目 → 从今天开始提醒 */
export function buildPlans(petId: string, items: TemplateItem[], picks: PlanPick[], today: ISODate, newId: () => string): Plan[] {
  return picks.map((pk) => {
    const t = items.find((i) => i.kind === pk.kind);
    if (!t) throw new Error(`unknown kind ${pk.kind}`);
    const prod = t.products && pk.product !== undefined ? t.products[pk.product] : undefined;
    const base: Plan = { id: newId(), petId, kind: t.kind, title: t.title, intervalDays: prod?.days ?? t.intervalDays, product: prod?.label };
    if (!t.askLast) return { ...base, dueDate: today };
    const bucket = pk.last !== undefined ? LAST_BUCKETS[pk.last] : undefined;
    if (!bucket || bucket.daysAgo === null) return { ...base, unknown: true };
    return { ...base, lastDone: addDays(today, -bucket.daysAgo) };
  });
}

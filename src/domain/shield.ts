import { addDays, diffDays, type ISODate } from './dates';
import type { Plan, PlanKind, Settings } from './types';

/** 护盾 = 驱虫/疫苗的闭环提醒。平时只显示「安全」，进入提醒期才倒计时，不显示百分比进度条 */
export type ShieldState = 'safe' | 'soon' | 'over' | 'unknown';
export const SHIELD_KINDS: PlanKind[] = ['deworm_in', 'deworm_out', 'vaccine_core', 'vaccine_rabies'];
export const SHIELD_TITLE: Record<string, string> = { deworm_in: '体内驱虫', deworm_out: '体外驱虫', vaccine_core: '核心疫苗', vaccine_rabies: '狂犬疫苗' };
export interface ShieldInfo { state: ShieldState; due?: ISODate; daysLeft?: number }
export type Lead = Pick<Settings, 'leadMonthly' | 'leadYearly'>;
export const DEFAULT_LEAD: Lead = { leadMonthly: 3, leadYearly: 14 };

/** 提醒期：每周的提前 1 天，月度提前 3 天（可设），年度提前 14 天（可设），其余（如季度）7 天 */
export function leadDays(intervalDays: number, lead: Lead = DEFAULT_LEAD): number {
  if (intervalDays <= 7) return 1;
  if (intervalDays <= 45) return lead.leadMonthly;
  if (intervalDays >= 300) return lead.leadYearly;
  return 7;
}

/** 下次到期 = 最近一次实际完成日 + 周期；从未完成过时用计划给的首个到期日 */
export function nextDue(p: Plan): ISODate | undefined {
  if (p.unknown) return undefined;
  if (p.lastDone) return addDays(p.lastDone, p.intervalDays);
  return p.dueDate;
}

export function shieldInfo(p: Plan, today: ISODate, lead: Lead = DEFAULT_LEAD): ShieldInfo {
  const due = nextDue(p);
  if (!due) return { state: 'unknown' };
  const left = diffDays(due, today);
  if (left < 0) return { state: 'over', due, daysLeft: left };
  if (left <= leadDays(p.intervalDays, lead)) return { state: 'soon', due, daysLeft: left };
  return { state: 'safe', due, daysLeft: left };
}

/** 只奖励按时：提醒期内或到期日完成 +10，逾期补做 +3，提前太多不加分（避免诱导过量用药），补录未知 +3 */
export const REWARD = { onTime: 10, late: 3, early: 0, unknown: 3 };
export function completionReward(p: Plan, actual: ISODate, lead: Lead = DEFAULT_LEAD): number {
  const due = nextDue(p);
  if (!due) return REWARD.unknown;
  const before = diffDays(due, actual);
  if (before < 0) return REWARD.late;
  return before <= leadDays(p.intervalDays, lead) ? REWARD.onTime : REWARD.early;
}

/** 完成即顺延：以实际完成日为锚点重算，而不是日历式固定重复 */
export function completePlan(p: Plan, actual: ISODate, product?: { label: string; days: number }): Plan {
  return {
    ...p, lastDone: actual, unknown: false, dueDate: undefined,
    product: product?.label ?? p.product, intervalDays: product?.days ?? p.intervalDays,
  };
}

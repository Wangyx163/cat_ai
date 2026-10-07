import { diffDays, fmtMD, type ISODate } from '../domain/dates';
import { SHIELD_KINDS, shieldInfo, type Lead } from '../domain/shield';
import { petWeights } from '../domain/summary';
import { weatherLevel, weatherScore } from '../domain/weather';
import { weightTrend } from '../domain/weight';
import type { Pet, State, Weather } from '../domain/types';

export const leadOf = (s: State): Lead => ({ leadMonthly: s.settings.leadMonthly, leadYearly: s.settings.leadYearly });
export const findPet = (s: State, id?: string): Pet | undefined => s.pets.find((p) => p.id === id);
export const memberName = (s: State, id: string) => s.members.find((m) => m.id === id)?.name ?? '家人';

export interface PetWeather { level: Weather; score: number; reasons: string[] }

/** 晴雨计 = 最近一次每日一问（今天或昨天）+ 护盾逾期 + 体重变化明显 + 最近的急症检测 */
export function petWeather(s: State, petId: string, today: ISODate): PetWeather {
  const recent = s.events
    .filter((e) => e.petId === petId && e.type === 'daily' && diffDays(today, e.date) >= 0 && diffDays(today, e.date) <= 1)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const issues = recent?.data?.issues ?? [];
  const overdue = s.plans.some((p) => p.petId === petId && SHIELD_KINDS.includes(p.kind) && shieldInfo(p, today, leadOf(s)).state === 'over');
  const anomaly = weightTrend(petWeights(s, petId), today).anomaly;
  const redFlag = s.checks.some((c) => c.petId === petId && c.level === 'emergency' && diffDays(today, c.date) <= 1);
  const score = weatherScore(issues, { overdue, weightAnomaly: anomaly });
  return { level: weatherLevel(score, redFlag), score, reasons: [...issues, ...(overdue ? ['护盾逾期'] : []), ...(anomaly ? ['体重变化明显'] : [])] };
}

export type TaskAction = 'complete' | 'weigh' | 'med' | 'revisit' | 'plan';
export interface Task { id: string; petId: string; planId: string; title: string; sub: string; action: TaskAction; urgent: boolean }

/** 今天的小事：护盾提醒期 / 逾期、称重、用药、复诊、待确认的计划 */
export function deriveTasks(s: State, today: ISODate): Task[] {
  const out: Task[] = [];
  for (const p of s.plans) {
    const pet = findPet(s, p.petId);
    if (!pet) continue;
    const base = { id: `t_${p.id}`, petId: p.petId, planId: p.id };
    if (p.kind === 'med') {
      if ((!p.endDate || p.endDate >= today) && p.lastDone !== today && (!p.dueDate || p.dueDate <= today))
        out.push({ ...base, title: `${pet.name} · ${p.title}`, sub: p.endDate ? `用到 ${fmtMD(p.endDate)}` : '按医嘱', action: 'med', urgent: false });
      continue;
    }
    if (p.kind === 'revisit') {
      if (p.dueDate && !p.lastDone) {
        const left = diffDays(p.dueDate, today);
        if (left <= 3) out.push({ ...base, title: `${pet.name} · 复诊`, sub: left < 0 ? `已过 ${-left} 天` : left === 0 ? '就是今天' : `还有 ${left} 天`, action: 'revisit', urgent: left < 0 });
      }
      continue;
    }
    const info = shieldInfo(p, today, leadOf(s));
    if (info.state === 'unknown') {
      if (SHIELD_KINDS.includes(p.kind)) out.push({ ...base, title: `${pet.name} · ${p.title}待确认`, sub: '补一下上次时间', action: 'plan', urgent: false });
      continue;
    }
    if (info.state !== 'soon' && info.state !== 'over') continue;
    const left = info.daysLeft ?? 0;
    const sub = info.state === 'over' ? `已逾期 ${-left} 天` : p.kind === 'weigh' ? (left === 0 ? '今天该称啦' : `${left} 天后该称`) : left === 0 ? '今天到期' : `护盾进入提醒期 · 还剩 ${left} 天`;
    out.push({ ...base, title: `${pet.name} · ${p.title}`, sub, action: p.kind === 'weigh' ? 'weigh' : 'complete', urgent: info.state === 'over' });
  }
  const rank: Record<TaskAction, number> = { complete: 0, med: 1, revisit: 2, weigh: 3, plan: 4 };
  return out.sort((a, b) => Number(b.urgent) - Number(a.urgent) || rank[a.action] - rank[b.action]);
}

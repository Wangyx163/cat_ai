import { ageText, diffDays, fmtMD, fmtYM, type ISODate } from './dates';
import { nextDue } from './shield';
import type { CheckSession, PlanKind, State } from './types';
import { weightTrend, type WeightPoint } from './weight';

export interface SummaryRow { k: string; v: string }
export interface Summary { title: string; subtitle: string; rows: SummaryRow[]; text: string }

export const petWeights = (s: State, petId: string): WeightPoint[] =>
  s.events.filter((e) => e.petId === petId && e.type === 'weight' && e.data?.kg !== undefined).map((e) => ({ date: e.date, kg: e.data!.kg! }));

/** 一键就诊摘要：给医生看的结构化信息（诊室模式），也能复制成纯文本 */
export function buildSummary(s: State, petId: string, session: CheckSession | undefined, today: ISODate): Summary {
  const pet = s.pets.find((p) => p.id === petId);
  if (!pet) throw new Error('pet not found');
  const subtitle = [pet.name, pet.breed, pet.sex === 'f' ? '母' : pet.sex === 'm' ? '公' : '性别未填',
    pet.birthday ? ageText(pet.birthday, today) : '年龄未填', pet.neutered === undefined ? '绝育未填' : pet.neutered ? '已绝育' : '未绝育'].join(' · ');
  const rows: SummaryRow[] = [];
  if (session) {
    if (session.redFlags.length) rows.push({ k: '紧急情况', v: session.redFlags.join('、') });
    if (session.symptoms.length) rows.push({ k: '本次症状', v: session.symptoms.join('、') });
    if (session.parts.length) rows.push({ k: '部位', v: session.parts.join(' · ') });
    if (session.duration) rows.push({ k: '持续时间', v: session.duration });
  }
  const daily = s.events.filter((e) => e.petId === petId && e.type === 'daily' && diffDays(today, e.date) >= 0 && diffDays(today, e.date) <= 14);
  const counts: Record<string, number> = {};
  daily.forEach((e) => (e.data?.issues ?? []).forEach((i) => { counts[i] = (counts[i] ?? 0) + 1; }));
  const issueText = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([i, n]) => `${n} 天${i}`).join(' · ');
  rows.push({ k: '近 14 天', v: daily.length ? issueText || `${daily.length} 次每日一问都正常` : '暂无每日一问记录' });
  const t = weightTrend(petWeights(s, petId), today);
  rows.push({ k: '体重', v: t.from !== undefined && t.to !== undefined ? `近 4 周 ${t.from} → ${t.to} kg` : t.last !== undefined ? `${t.last} kg` : '暂无记录' });
  const plan = (k: PlanKind) => s.plans.find((p) => p.petId === petId && p.kind === k);
  const di = plan('deworm_in');
  const dout = plan('deworm_out');
  const vc = plan('vaccine_core');
  const vr = plan('vaccine_rabies');
  rows.push({ k: '驱虫', v: [di?.lastDone ? `体内 ${fmtMD(di.lastDone)}` : '体内未记录', dout?.lastDone ? `体外 ${fmtMD(dout.lastDone)}` : '体外未记录'].join(' · ') });
  const vrDue = vr ? nextDue(vr) : undefined;
  rows.push({ k: '疫苗', v: [vc?.lastDone ? `核心疫苗 ${fmtYM(vc.lastDone)} 接种` : '核心疫苗未记录', vrDue ? `狂犬 ${fmtYM(vrDue)} 到期` : '狂犬未记录'].join(' · ') });
  const meds = s.plans.filter((p) => p.petId === petId && p.kind === 'med' && (!p.endDate || p.endDate >= today)).map((p) => p.title);
  rows.push({ k: '过敏与用药', v: [pet.allergies ? `过敏：${pet.allergies}` : '无过敏记录', meds.length ? `在用：${meds.join('、')}` : '无在用药'].join(' · ') });
  const visits = s.events.filter((e) => e.petId === petId && e.type === 'visit');
  rows.push({ k: '既往就诊', v: visits.length ? visits.slice(0, 3).map((v) => `${fmtMD(v.date)} ${v.title}`).join('；') : '无' });
  const text = [`【就诊摘要】${subtitle}`, ...rows.map((r) => `${r.k}：${r.v}`), '（毛球屋生成，仅供参考，不能替代兽医诊断）'].join('\n');
  return { title: '就诊摘要', subtitle, rows, text };
}

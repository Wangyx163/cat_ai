import { describe, expect, it } from 'vitest';
import { addDays } from '../src/domain/dates';
import { shieldInfo } from '../src/domain/shield';
import type { CheckSession, State } from '../src/domain/types';
import { reducer, type Action } from '../src/store/reducer';
import { deriveTasks } from '../src/store/selectors';
import { seed } from '../src/store/seed';

const T = '2026-10-08';
const run = (s: State, ...actions: Action[]) => actions.reduce(reducer, s);
const plan = (s: State, petId: string, kind: string) => s.plans.find((p) => p.petId === petId && p.kind === kind)!;

describe('每日一问闭环', () => {
  it('一天只奖励一次，与回答内容无关；报告异常回「谢谢告诉我」', () => {
    const s0 = seed(T);
    const s1 = run(s0, { type: 'daily/submit', date: T, entries: [{ petId: 'p_zhima', ok: false, issues: ['少吃'] }, { petId: 'p_juzi', ok: true, issues: [] }] });
    expect(s1.fish).toBe(s0.fish + 1);
    expect(s1.toast).toBe('谢谢告诉我，小鱼干 +1');
    expect(s1.sunnyDays.p_juzi).toBe(s0.sunnyDays.p_juzi + 1);
    const s2 = run(s1, { type: 'daily/submit', date: T, entries: [{ petId: 'p_zhima', ok: true, issues: [] }] });
    expect(s2.fish).toBe(s1.fish);
    expect(s2.events.filter((e) => e.type === 'daily' && e.date === T && e.petId === 'p_zhima')).toHaveLength(1);
  });
  it('轻症观察：明天的每日一问追问，打卡后清除', () => {
    const session: CheckSession = { id: 'c1', petId: 'p_zhima', date: T, createdAt: 0, redFlags: [], parts: ['肚子'], symptoms: ['少吃'], duration: '今天', level: 'observe' };
    const s1 = run(seed(T), { type: 'check/save', session });
    expect(s1.followUp.p_zhima).toBe(addDays(T, 1));
    const s2 = run(s1, { type: 'daily/submit', date: addDays(T, 1), entries: [{ petId: 'p_zhima', ok: true, issues: [] }] });
    expect(s2.followUp.p_zhima).toBeUndefined();
  });
});

describe('护盾打卡闭环', () => {
  it('按时完成 +10 并顺延，提醒从今日小事消失', () => {
    const s0 = seed(T);
    const p = plan(s0, 'p_doubao', 'deworm_out');
    const s1 = run(s0, { type: 'plan/complete', planId: p.id, date: T });
    expect(s1.fish).toBe(s0.fish + 10);
    expect(shieldInfo(plan(s1, 'p_doubao', 'deworm_out'), T)).toMatchObject({ state: 'safe', due: addDays(T, 30) });
    expect(deriveTasks(s1, T).some((t) => t.title === '豆包 · 体外驱虫')).toBe(false);
    expect(s1.events[0]).toMatchObject({ type: 'care', by: 'm_ayou', data: { onTime: true } });
  });
  it('家人打卡会记下操作人', () => {
    const s0 = run(seed(T), { type: 'member/switch', id: 'm_xiaolin' });
    const s1 = run(s0, { type: 'plan/complete', planId: plan(s0, 'p_doubao', 'deworm_out').id, date: T });
    expect(s1.events[0].by).toBe('m_xiaolin');
  });
});

describe('称重闭环', () => {
  it('写入体重、顺延称重计划；变化明显时提示咨询兽医', () => {
    const s0 = seed(T);
    const s1 = run(s0, { type: 'weight/add', petId: 'p_zhima', kg: 4.0, date: T, method: 'held' });
    expect(plan(s1, 'p_zhima', 'weigh').lastDone).toBe(T);
    expect(s1.fish).toBe(s0.fish + 2);
    expect(s1.toast).toContain('建议咨询兽医');
    const s2 = run(s0, { type: 'weight/add', petId: 'p_doubao', kg: 11.9, date: addDays(T, 7), method: 'direct' });
    expect(s2.toast).toBe('记好了，小鱼干 +2');
  });
});

describe('就诊回填闭环', () => {
  it('生成用药与复诊提醒，喂药后当天不再提醒，复诊完成后计划移除', () => {
    const s1 = run(seed(T), { type: 'visit/backfill', petId: 'p_zhima', date: T, diagnosis: '肠胃问题', meds: [{ name: '益生菌', perDay: 2, days: 5 }], revisit: addDays(T, 2) });
    const tasks = deriveTasks(s1, T).map((t) => t.title);
    expect(tasks).toContain('芝麻 · 益生菌 · 每天 2 次');
    expect(tasks).toContain('芝麻 · 复诊');
    const med = plan(s1, 'p_zhima', 'med');
    expect(med.endDate).toBe(addDays(T, 4));
    const s2 = run(s1, { type: 'plan/complete', planId: med.id, date: T });
    expect(deriveTasks(s2, T).map((t) => t.title)).not.toContain('芝麻 · 益生菌 · 每天 2 次');
    expect(deriveTasks(s2, addDays(T, 1)).map((t) => t.title)).toContain('芝麻 · 益生菌 · 每天 2 次');
    expect(deriveTasks(s2, addDays(T, 5)).map((t) => t.title)).not.toContain('芝麻 · 益生菌 · 每天 2 次');
    const s3 = run(s2, { type: 'plan/complete', planId: plan(s2, 'p_zhima', 'revisit').id, date: addDays(T, 2) });
    expect(s3.plans.some((p) => p.kind === 'revisit')).toBe(false);
  });
});

describe('圈子闭环', () => {
  it('约遛：嗅一嗅 → 邀约 → 见面打卡 → 评价成为宠友；不合适则不再推荐', () => {
    let s = run(seed(T), { type: 'walk/sniff', id: 'c_kele' }, { type: 'walk/schedule', candidateId: 'c_kele', slot: '周三 19:30', place: '滨河公园东门草坪' });
    const ap = s.appointments.find((a) => a.candidateId === 'c_kele')!;
    s = run(s, { type: 'walk/met', apptId: ap.id, date: T }, { type: 'walk/rate', apptId: ap.id, rating: 'great' });
    expect(s.friends).toContain('c_kele');
    expect(s.events[0]).toMatchObject({ type: 'walk', title: '和可乐一起遛弯' });
    const bad = run(seed(T), { type: 'walk/schedule', candidateId: 'c_mantou', slot: '周六 9:00', place: 'x' });
    const ap2 = bad.appointments[0];
    expect(run(bad, { type: 'walk/rate', apptId: ap2.id, rating: 'bad' }).blocked).toContain('c_mantou');
  });
  it('走失：线索 +5 并获得守护者徽章；自己的求助可扩大范围、找回后下架', () => {
    const s0 = seed(T);
    const s1 = run(s0, { type: 'lost/sighting', alertId: 'lost_1', note: '车库' });
    expect(s1.fish).toBe(s0.fish + 5);
    expect(s1.badges).toContain('守护者');
    const s2 = run(s1, { type: 'lost/create', petId: 'p_juzi' });
    const mine = s2.lost.find((l) => l.mine)!;
    expect(run(s2, { type: 'lost/sighting', alertId: mine.id, note: 'x' })).toBe(s2);
    const s3 = run(s2, { type: 'lost/expand', alertId: mine.id }, { type: 'lost/resolve', alertId: mine.id, date: T });
    expect(s3.lost.find((l) => l.id === mine.id)).toMatchObject({ radiusKm: 3, resolved: true });
    expect(s3.pets.find((p) => p.id === 'p_juzi')?.lost).toBe(false);
  });
  it('送小鱼干：每条一次、每天上限；串门两次成为宠友', () => {
    let s = run(seed(T), { type: 'post/like', postId: 'post_1', date: T });
    expect(s.posts[0]).toMatchObject({ fish: 13, liked: true });
    expect(run(s, { type: 'post/like', postId: 'post_1', date: T })).toBe(s);
    s = run(s, { type: 'home/fish', homeId: 'h_keke', date: T }, { type: 'home/fish', homeId: 'h_keke', date: T });
    expect(s.homes.find((h) => h.id === 'h_keke')?.friend).toBe(true);
    s = run(s, { type: 'home/fish', homeId: 'h_keke', date: T }, { type: 'home/fish', homeId: 'h_keke', date: T });
    expect(s.visitsSent[`h_keke|${T}`]).toBe(3);
  });
  it('托付：接单 → 打卡 → 完成，时间线记一笔', () => {
    let s = run(seed(T), { type: 'foster/create', foster: { petId: 'p_juzi', from: T, to: addDays(T, 2), services: ['喂食'] } });
    const id = s.fosters[0].id;
    s = run(s, { type: 'foster/accept', id, helper: '布丁妈' }, { type: 'foster/checkin', id, date: T, note: 'ok' }, { type: 'foster/done', id, rating: '满意', date: T });
    expect(s.fosters[0]).toMatchObject({ status: 'done', rating: '满意' });
    expect(s.events[0].title).toBe('被布丁妈照顾的 1 天');
  });
});

import { describe, expect, it } from 'vitest';
import { addDays, ageText, diffDays } from '../src/domain/dates';
import { decodeGeohash, distanceKm, encodeGeohash } from '../src/domain/geo';
import { eventEligible, eventScore, rankEvents, sizesText } from '../src/domain/match';
import { milestones, statsBetween } from '../src/domain/milestones';
import { buildPlans, stageOf, templateFor } from '../src/domain/planTemplate';
import { completePlan, completionReward, leadDays, shieldInfo } from '../src/domain/shield';
import { buildSummary } from '../src/domain/summary';
import { triage } from '../src/domain/triage';
import type { Plan, WalkEvent, WalkProfile } from '../src/domain/types';
import { weatherLevel, weatherScore } from '../src/domain/weather';
import { heldWeight, inRange, weighStreak, weightTrend } from '../src/domain/weight';
import { deriveTasks, petWeather } from '../src/store/selectors';
import { seed } from '../src/store/seed';

const T = '2026-10-08';

describe('日期', () => {
  it('跨月跨年加减与相差天数', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-10-08', '2026-09-08')).toBe(30);
  });
  it('年龄文字', () => {
    expect(ageText(addDays(T, -215), T)).toBe('7 个月');
    expect(ageText(addDays(T, -730), T)).toBe('2 岁');
    expect(ageText('2024-10-09', T)).toBe('1 岁');
    expect(ageText('2026-09-09', T)).toBe('不到 1 个月');
  });
});

describe('护盾闭环', () => {
  const p: Plan = { id: 'x', petId: 'p', kind: 'deworm_out', title: '体外驱虫', intervalDays: 30 };
  it('平时安全，进入提醒期才倒计时，过期为逾期', () => {
    expect(shieldInfo({ ...p, lastDone: addDays(T, -20) }, T).state).toBe('safe');
    expect(shieldInfo({ ...p, lastDone: addDays(T, -28) }, T)).toMatchObject({ state: 'soon', daysLeft: 2 });
    expect(shieldInfo({ ...p, lastDone: addDays(T, -31) }, T)).toMatchObject({ state: 'over', daysLeft: -1 });
    expect(shieldInfo({ ...p, unknown: true }, T).state).toBe('unknown');
    expect(shieldInfo(p, T).state).toBe('unknown');
  });
  it('提醒期：月度 3 天、年度 14 天、每周 1 天、季度 7 天，可按设置调整', () => {
    expect(leadDays(30)).toBe(3);
    expect(leadDays(365)).toBe(14);
    expect(leadDays(7)).toBe(1);
    expect(leadDays(90)).toBe(7);
    expect(leadDays(30, { leadMonthly: 5, leadYearly: 30 })).toBe(5);
    const v: Plan = { ...p, kind: 'vaccine_rabies', intervalDays: 365 };
    expect(shieldInfo({ ...v, lastDone: addDays(T, -355) }, T).state).toBe('soon');
    expect(shieldInfo({ ...v, lastDone: addDays(T, -340) }, T).state).toBe('safe');
  });
  it('只奖励按时：提醒期内 +10，逾期 +3，提前太多 0，补录未知 +3', () => {
    const q = { ...p, lastDone: addDays(T, -28) }; // 到期日 T+2
    expect(completionReward(q, T)).toBe(10);
    expect(completionReward(q, addDays(T, 5))).toBe(3);
    expect(completionReward(q, addDays(T, -10))).toBe(0);
    expect(completionReward({ ...p, unknown: true }, T)).toBe(3);
  });
  it('完成即顺延：以实际完成日为锚点，换产品时按新周期', () => {
    const done = completePlan({ ...p, lastDone: addDays(T, -28) }, addDays(T, -1), { label: '口服 · 约 3 个月', days: 90 });
    expect(done.lastDone).toBe(addDays(T, -1));
    expect(done.intervalDays).toBe(90);
    expect(shieldInfo(done, T).due).toBe(addDays(T, 89));
  });
});

describe('晴雨计', () => {
  it('计分与分档', () => {
    expect(weatherLevel(weatherScore([]))).toBe('sun');
    expect(weatherLevel(weatherScore(['喝水变少', '打喷嚏']))).toBe('cloud');
    expect(weatherScore(['少吃', '便便偏软'], { weightAnomaly: true })).toBe(55);
    expect(weatherLevel(45)).toBe('rain');
    expect(weatherLevel(weatherScore(['不吃', '呕吐']))).toBe('alert');
    expect(weatherLevel(100, true)).toBe('alert');
  });
});

describe('体重', () => {
  it('近 4 周变化超过 5% 提示', () => {
    const pts = [{ date: addDays(T, -28), kg: 4.4 }, { date: addDays(T, -14), kg: 4.2 }, { date: addDays(T, -7), kg: 4.1 }];
    expect(weightTrend(pts, T)).toMatchObject({ anomaly: true, from: 4.4, to: 4.1, changePct: -6.8 });
    expect(weightTrend([{ date: T, kg: 4 }], T)).toMatchObject({ anomaly: false, last: 4 });
  });
  it('抱宠称重自动相减并校验', () => {
    expect(heldWeight(66.3, 54.5)).toBe(11.8);
    expect(heldWeight(50, 60)).toBeNull();
    expect(heldWeight(0, 50)).toBeNull();
  });
  it('区间与连续按时称重', () => {
    expect(inRange(11.8, [10.5, 12.5])).toBe(true);
    expect(inRange(13, [10.5, 12.5])).toBe(false);
    expect(inRange(13)).toBeUndefined();
    const weekly = [0, -7, -14, -21, -28].map((o, i) => ({ date: addDays(T, o), kg: 11.8 - i * 0.1 }));
    expect(weighStreak(weekly, 7, T)).toBe(5);
    expect(weighStreak(weekly, 7, addDays(T, 20))).toBe(0);
  });
});

describe('分诊', () => {
  it('红旗直接就医，持续或症状多则预约，轻症观察', () => {
    expect(triage({ redFlags: ['抽搐'], symptoms: [], duration: '今天' })).toBe('emergency');
    expect(triage({ redFlags: [], symptoms: ['少吃'], duration: '2–3 天' })).toBe('appointment');
    expect(triage({ redFlags: [], symptoms: ['呕吐', '腹泻'], duration: '今天' })).toBe('appointment');
    expect(triage({ redFlags: [], symptoms: ['少吃'], duration: '今天' })).toBe('observe');
  });
});

describe('计划模板', () => {
  it('年龄阶段与默认项目', () => {
    expect(stageOf(addDays(T, -215), T)).toBe('baby');
    expect(stageOf(addDays(T, -3000), T)).toBe('senior');
    const items = templateFor('cat', 'baby');
    expect(items.find((i) => i.kind === 'weigh')?.intervalDays).toBe(7);
    expect(items.filter((i) => i.defaultOn).length).toBe(6);
  });
  it('点选结果变计划：时间桶、不记得、产品周期、从今天开始', () => {
    let n = 0;
    const items = templateFor('dog', 'adult');
    const plans = buildPlans('p', items, [
      { kind: 'deworm_in', last: 2, product: 1 }, { kind: 'vaccine_core', last: 4 }, { kind: 'weigh' },
    ], T, () => `id${++n}`);
    expect(plans[0]).toMatchObject({ lastDone: addDays(T, -15), intervalDays: 30, product: '滴剂 · 约 1 个月' });
    expect(plans[1]).toMatchObject({ unknown: true });
    expect(plans[2]).toMatchObject({ dueDate: T, intervalDays: 30 });
  });
});

describe('里程碑与统计', () => {
  const s = seed(T);
  it('到家 365 天与生日', () => {
    const ms = milestones(s.pets[0], T);
    expect(ms[0]).toMatchObject({ title: '到家 365 天', date: T });
    expect(ms.some((m) => m.title === '2 岁生日')).toBe(true);
  });
  it('一年统计用于分享卡片', () => {
    expect(statsBetween(s, 'p_juzi', addDays(T, -365), T)).toMatchObject({ weightTo: 4.6, dewormOnTime: 12, sunnyDays: 318 });
  });
});

describe('位置与遛狗局', () => {
  const home = encodeGeohash(30.2741, 120.1551);
  it('geohash 只保留约一公里精度', () => {
    expect(home).toHaveLength(6);
    const c = decodeGeohash(home);
    expect(Math.abs(c.lat - 30.2741)).toBeLessThan(0.01);
    expect(distanceKm(home, encodeGeohash(30.35, 120.25))).toBeGreaterThan(5);
  });
  const me: WalkProfile = { petId: 'p', size: 'M', temper: ['慢热', '温柔'], slots: ['工作日晚上', '周末上午'], places: [], scaredOfBig: false, inHeat: false };
  const ev = (o: Partial<WalkEvent>): WalkEvent => ({ id: 'e', host: 'h', when: '今晚 20:00', slot: '工作日晚上', place: 'p', geohash: home, sizes: ['S', 'M'], vibe: '安静慢遛', capacity: 5, dogs: [], joined: false, status: 'open', ...o });
  it('过滤：疫苗、发情期、距离、体型、怕大狗、满员', () => {
    expect(eventEligible(me, true, ev({}), 0.5)).toBe(true);
    expect(eventEligible(me, false, ev({}), 0.5)).toBe(false);
    expect(eventEligible({ ...me, inHeat: true }, true, ev({}), 0.5)).toBe(false);
    expect(eventEligible(me, true, ev({}), 4)).toBe(false);
    expect(eventEligible(me, true, ev({ sizes: ['S'] }), 0.5)).toBe(false);
    expect(eventEligible({ ...me, scaredOfBig: true }, true, ev({ sizes: ['S', 'M', 'L'] }), 0.5)).toBe(false);
    expect(eventEligible(me, true, ev({ capacity: 2, dogs: [{ name: 'a', look: 'kele', size: 'M' }, { name: 'b', look: 'kele', size: 'M' }] }), 0.5)).toBe(false);
  });
  it('排序：时段 40 + 氛围 30 + 距离 20 + 规模 10', () => {
    expect(eventScore(me, ev({ dogs: [{ name: 'a', look: 'kele', size: 'M' }, { name: 'b', look: 'kele', size: 'M' }] }), 0)).toBe(100);
    expect(sizesText(['S', 'M'])).toBe('小型、中型犬');
    expect(sizesText(['S', 'M', 'L'])).toBe('不限体型');
    const s = seed(T);
    const ranked = rankEvents(s.walk, true, s.myGeohash, s.walkEvents, new Set(s.hiddenHosts));
    expect(ranked.map((r) => [r.e.host, r.score])).toEqual([['馒头爸', 100], ['可乐妈', 62]]);
  });
});

describe('就诊摘要与选择器（演示数据）', () => {
  const s = seed(T);
  it('芝麻的摘要包含近 14 天与体重趋势', () => {
    const sum = buildSummary(s, 'p_zhima', undefined, T);
    const row = (k: string) => sum.rows.find((r) => r.k === k)?.v;
    expect(row('近 14 天')).toBe('4 天少吃 · 2 天便便偏软');
    expect(row('体重')).toBe('近 4 周 4.4 → 4.1 kg');
    expect(sum.text).toContain('不能替代兽医诊断');
  });
  it('晴雨计：橘子晴、豆包多云、芝麻小雨', () => {
    expect(petWeather(s, 'p_juzi', T).level).toBe('sun');
    expect(petWeather(s, 'p_doubao', T).level).toBe('cloud');
    expect(petWeather(s, 'p_zhima', T)).toMatchObject({ level: 'rain', reasons: ['少吃', '便便偏软', '体重变化明显'] });
  });
  it('今天的小事：豆包体外驱虫排第一，芝麻该称体重', () => {
    const t = deriveTasks(s, T);
    expect(t.map((x) => x.title)).toEqual(['豆包 · 体外驱虫', '芝麻 · 称体重']);
    expect(t[0].sub).toBe('护盾进入提醒期 · 还剩 2 天');
    expect(t[1].sub).toBe('今天该称啦');
  });
});

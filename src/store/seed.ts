import { addDays, type ISODate } from '../domain/dates';
import { encodeGeohash } from '../domain/geo';
import type { PetEvent, Plan, PlanKind, State } from '../domain/types';

export const STATE_VERSION = 2;

/** 演示数据：全部相对「今天」生成，保证任何一天打开都是同样的故事 */
export function seed(today: ISODate): State {
  const d = (n: number) => addDays(today, n);
  let k = 0;
  const id = (p: string) => `${p}_${++k}`;
  const plans: Plan[] = [];
  const events: PetEvent[] = [];
  const plan = (petId: string, kind: PlanKind, title: string, intervalDays: number, lastDone?: ISODate, extra: Partial<Plan> = {}) =>
    plans.push({ id: id('pl'), petId, kind, title, intervalDays, lastDone, ...extra });
  const ev = (petId: string, type: PetEvent['type'], date: ISODate, title: string, extra: Partial<PetEvent> = {}) =>
    events.push({ id: id('ev'), petId, type, date, by: 'm_ayou', title, visibility: 'family', ...extra });
  const care = (petId: string, kind: PlanKind, title: string, date: ISODate) =>
    ev(petId, 'care', date, `${title} · 护盾充满`, { data: { kind, onTime: true } });
  const weights = (petId: string, list: [number, number][]) =>
    list.forEach(([offset, kg]) => ev(petId, 'weight', d(offset), `称重 ${kg} kg`, { data: { kg }, detail: '直接称' }));

  // 橘子：到家整一年，状态很好
  plan('p_juzi', 'deworm_in', '体内驱虫', 90, d(-20), { product: '片剂 · 约 3 个月' });
  plan('p_juzi', 'deworm_out', '体外驱虫', 30, d(-5), { product: '滴剂 · 约 1 个月' });
  plan('p_juzi', 'vaccine_core', '核心疫苗', 365, d(-200));
  plan('p_juzi', 'vaccine_rabies', '狂犬疫苗', 365, d(-200));
  plan('p_juzi', 'weigh', '称体重', 30, d(-7));
  weights('p_juzi', [3.1, 3.3, 3.5, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6].map((kg, i): [number, number] => [-7 - 30 * (12 - i), kg]));
  for (let i = 11; i >= 0; i--) care('p_juzi', 'deworm_out', '体外驱虫', d(-5 - 30 * i));
  ev('p_juzi', 'moment', d(-12), '第一次自己打开柜门偷吃冻干', { visibility: 'friends' });

  // 芝麻：7 个月英短，这几天少吃、软便，体重在掉
  plan('p_zhima', 'deworm_in', '体内驱虫', 90, d(-36), { product: '片剂 · 约 3 个月' });
  plan('p_zhima', 'deworm_out', '体外驱虫', 30, d(-10), { product: '滴剂 · 约 1 个月' });
  plan('p_zhima', 'vaccine_core', '核心疫苗', 365, d(-60));
  plan('p_zhima', 'vaccine_rabies', '狂犬疫苗', 365, d(-60));
  plan('p_zhima', 'weigh', '称体重', 7, d(-7));
  weights('p_zhima', [[-28, 4.4], [-21, 4.3], [-14, 4.2], [-7, 4.1]]);
  care('p_zhima', 'deworm_out', '体外驱虫', d(-10));
  const zhimaDaily: [number, string[]][] = [[-4, ['少吃']], [-3, ['少吃']], [-2, ['少吃', '便便偏软']], [-1, ['少吃', '便便偏软']]];
  zhimaDaily.forEach(([o, issues]) => ev('p_zhima', 'daily', d(o), `每日一问：${issues.join('、')}`, { data: { ok: false, issues } }));

  // 豆包：柯基，体外驱虫还剩 2 天，体重每周按时称
  plan('p_doubao', 'deworm_in', '体内驱虫', 90, d(-17), { product: '片剂 · 约 3 个月' });
  plan('p_doubao', 'deworm_out', '体外驱虫', 30, d(-28), { product: '滴剂 · 约 1 个月' });
  plan('p_doubao', 'vaccine_core', '核心疫苗', 365, d(-210));
  plan('p_doubao', 'vaccine_rabies', '狂犬疫苗', 365, d(-210));
  plan('p_doubao', 'weigh', '称体重', 7, d(0));
  weights('p_doubao', [[-28, 11.4], [-21, 11.5], [-14, 11.6], [-7, 11.7], [0, 11.8]]);
  care('p_doubao', 'deworm_out', '体外驱虫', d(-28));
  ev('p_doubao', 'daily', d(-1), '每日一问：喝水变少、打喷嚏', { data: { ok: false, issues: ['喝水变少', '打喷嚏'] } });
  ev('p_juzi', 'daily', d(-1), '每日一问：都挺好', { data: { ok: true, issues: [] } });
  ev('p_doubao', 'walk', d(-9), '参加遛狗局：滨河公园东门草坪（4 只狗）', { visibility: 'friends' });

  const home = encodeGeohash(30.2741, 120.1551);
  return {
    version: STATE_VERSION, nickname: '阿柚', me: 'm_ayou', fish: 128, badges: [],
    members: [{ id: 'm_ayou', name: '阿柚' }, { id: 'm_xiaolin', name: '小林' }],
    settings: { dailyTime: '21:00', leadMonthly: 3, leadYearly: 14 },
    pets: [
      { id: 'p_juzi', name: '橘子', species: 'cat', breed: '中华田园猫', look: 'juzi', sex: 'm', birthday: d(-730), adoptedAt: d(-365), neutered: true, lifestyle: 'indoor', weightRange: [4.0, 5.2] },
      { id: 'p_zhima', name: '芝麻', species: 'cat', breed: '英短', look: 'zhima', sex: 'f', birthday: d(-215), adoptedAt: d(-150), neutered: false, lifestyle: 'indoor' },
      { id: 'p_doubao', name: '豆包', species: 'dog', breed: '柯基', look: 'doubao', sex: 'm', birthday: d(-1100), adoptedAt: d(-900), neutered: true, lifestyle: 'outdoor', size: 'M', weightRange: [10.5, 12.5], hospital: '滨河宠物医院' },
    ],
    plans, events: events.sort((a, b) => b.date.localeCompare(a.date)),
    sunnyDays: { p_juzi: 318, p_zhima: 96, p_doubao: 640 },
    dailyDone: { [d(-1)]: true }, dailySkipped: {}, followUp: {}, checks: [],
    posts: [
      { id: 'post_1', author: '可可妈', look: 'zhima', layer: 'interest', circle: '英短圈', text: '7 个月英短软便两天，换粮大家都怎么过渡的？', tags: ['猫', '7 个月', '4.1 kg', '近 3 天少吃'], ask: true, fish: 12, answers: 3, adopted: true, ago: '3 小时前' },
      { id: 'post_5', author: '晒太阳的橘', look: 'juzi', layer: 'interest', circle: '橘猫圈', text: '窗台是它的专属晒太阳位，一睡一下午', tags: ['橘猫', '日常'], fish: 56, answers: 8, ago: '1 小时前', cover: 'feed_cat_window' },
      { id: 'post_2', author: '布丁妈', look: 'doubao', layer: 'friends', circle: '宠友', text: '周六滨河公园的遛狗局，来了 5 只狗狗，下周继续！', tags: ['遛狗局'], fish: 18, answers: 2, ago: '昨天', cover: 'walk_party' },
      { id: 'post_6', author: '糖糖', look: 'zhima', layer: 'interest', circle: '新手幼猫圈', text: '第一次带猫打疫苗，要准备什么？', tags: ['猫', '3 个月', '新手'], ask: true, fish: 15, answers: 6, ago: '5 小时前' },
      { id: 'post_3', author: '大橘爸', look: 'juzi', layer: 'nearby', circle: '附近', text: '望江街区那家宠物医院周末也有值班医生，记一下。', tags: ['本地经验'], fish: 21, answers: 5, ago: '2 天前' },
      { id: 'post_4', author: '柴柴家', look: 'kele', layer: 'city', circle: '柴犬圈', text: '柴犬的笑容真的会传染', tags: ['柴犬'], fish: 46, answers: 9, ago: '3 天前' },
    ],
    lost: [{ id: 'lost_1', petName: '年糕', desc: '三花猫 · 胆小，叫名字会躲 · 戴红色项圈', area: '望江街区东侧', since: '2 小时前', radiusKm: 1, sightings: [], mine: false, resolved: false }],
    walk: { petId: 'p_doubao', size: 'M', temper: ['慢热', '温柔'], slots: ['工作日晚上', '周末上午'], places: ['滨河公园东门草坪'], scaredOfBig: false, inHeat: false },
    walkEvents: [
      { id: 'we_1', host: '布丁妈', when: '周六 9:00', slot: '周末上午', place: '滨河公园东门草坪', geohash: encodeGeohash(30.27, 120.15), sizes: ['S', 'M'], vibe: '新手友好', capacity: 6,
        dogs: [{ name: '布丁', look: 'doubao', size: 'M' }, { name: '可乐', look: 'kele', size: 'M' }], joined: true, status: 'open' },
      { id: 'we_2', host: '馒头爸', when: '今晚 20:00', slot: '工作日晚上', place: '滨河公园东门草坪', geohash: encodeGeohash(30.276, 120.149), sizes: ['S', 'M'], vibe: '安静慢遛', capacity: 5,
        dogs: [{ name: '馒头', look: 'doubao', size: 'M' }, { name: '豆豆', look: 'doubao', size: 'S' }], joined: false, status: 'open' },
      { id: 'we_3', host: '可乐妈', when: '今晚 19:30', slot: '工作日晚上', place: '城西公园宠物区', geohash: encodeGeohash(30.279, 120.16), sizes: ['S', 'M', 'L'], vibe: '大狗撒欢', capacity: 8,
        dogs: [{ name: '可乐', look: 'kele', size: 'M' }, { name: '阿黄', look: 'kele', size: 'L' }, { name: '栗子', look: 'kele', size: 'M' }], joined: false, status: 'open' },
      { id: 'we_4', host: '年年妈', when: '明早 7:30', slot: '工作日早上', place: '望江街区口袋公园', geohash: encodeGeohash(30.273, 120.156), sizes: ['S'], vibe: '幼犬社交', capacity: 4,
        dogs: [{ name: '年年', look: 'doubao', size: 'S' }], joined: false, status: 'open' },
      { id: 'we_5', host: '阿福家', when: '周日 16:00', slot: '周末下午', place: '远郊湿地公园', geohash: encodeGeohash(30.35, 120.25), sizes: ['S', 'M', 'L'], vibe: '新手友好', capacity: 6,
        dogs: [{ name: '阿福', look: 'kele', size: 'M' }], joined: false, status: 'open' },
    ],
    hiddenHosts: [], friends: ['布丁妈'],
    fosters: [],
    homes: [
      { id: 'h_keke', owner: '可可妈', petName: '可可', look: 'zhima', friend: false },
      { id: 'h_buding', owner: '布丁妈', petName: '布丁', look: 'doubao', friend: true },
      { id: 'h_dajv', owner: '大橘爸', petName: '大橘', look: 'juzi', friend: false },
    ],
    visitsSent: {}, likesToday: {}, myGeohash: home,
  };
}

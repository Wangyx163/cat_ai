import { addDays, type ISODate } from '../domain/dates';
import { completePlan, completionReward, REWARD } from '../domain/shield';
import { petWeights } from '../domain/summary';
import { LEVEL_TEXT } from '../domain/triage';
import { inRange, weightTrend } from '../domain/weight';
import type { CheckSession, DailyEntry, Foster, Layer, Pet, PetEvent, Plan, Post, Settings, State, Visibility, WalkEvent, WalkProfile } from '../domain/types';
import { leadOf } from './selectors';

export const LIMITS = { likesPerDay: 20, visitFishPerHomePerDay: 3 };
export const BONUS = { daily: 1, weighOnTime: 2, weighLate: 1, med: 1, revisit: 5, sighting: 5, fosterDone: 5 };

let seq = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(++seq).toString(36)}`;

export type Action =
  | { type: 'toast'; text?: string }
  | { type: 'daily/submit'; date: ISODate; entries: DailyEntry[] }
  | { type: 'daily/skip'; date: ISODate }
  | { type: 'plan/complete'; planId: string; date: ISODate; product?: { label: string; days: number } }
  | { type: 'plans/set'; petId: string; plans: Plan[] }
  | { type: 'weight/add'; petId: string; kg: number; date: ISODate; method: 'direct' | 'held' }
  | { type: 'check/save'; session: CheckSession }
  | { type: 'visit/backfill'; petId: string; date: ISODate; diagnosis: string; meds: { name: string; perDay: number; days: number }[]; revisit?: ISODate; cost?: string }
  | { type: 'visit/recovered'; petId: string; date: ISODate }
  | { type: 'moment/add'; petId: string; date: ISODate; text: string; image?: string; visibility: Visibility }
  | { type: 'post/add'; post: Post }
  | { type: 'post/like'; postId: string; date: ISODate }
  | { type: 'post/adopt'; postId: string }
  | { type: 'lost/create'; petId: string }
  | { type: 'lost/sighting'; alertId: string; note: string }
  | { type: 'lost/expand'; alertId: string }
  | { type: 'lost/resolve'; alertId: string; date: ISODate }
  | { type: 'walk/join'; id: string }
  | { type: 'walk/leave'; id: string }
  | { type: 'walk/host'; event: Pick<WalkEvent, 'when' | 'slot' | 'place' | 'sizes' | 'vibe' | 'capacity'> }
  | { type: 'walk/checkin'; id: string; date: ISODate }
  | { type: 'walk/rate'; id: string; rating: 'great' | 'ok' | 'bad' }
  | { type: 'walk/profile'; profile: WalkProfile }
  | { type: 'home/fish'; homeId: string; date: ISODate }
  | { type: 'foster/create'; foster: Omit<Foster, 'id' | 'status' | 'checkins'> }
  | { type: 'foster/accept'; id: string; helper: string }
  | { type: 'foster/checkin'; id: string; date: ISODate; note: string }
  | { type: 'foster/done'; id: string; rating: string; date: ISODate }
  | { type: 'pet/add'; pet: Pet }
  | { type: 'pet/update'; id: string; patch: Partial<Pet> }
  | { type: 'member/add'; name: string }
  | { type: 'member/switch'; id: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'nickname/update'; name: string }
  | { type: 'state/replace'; state: State };

const VIS_LAYER: Partial<Record<Visibility, Layer>> = { friends: 'friends', nearby: 'nearby', public: 'interest' };

function mkEvent(s: State, petId: string, type: PetEvent['type'], date: ISODate, title: string, extra: Partial<PetEvent> = {}): PetEvent {
  return { id: uid('ev'), petId, type, date, by: s.me, title, visibility: 'family', ...extra };
}
const petOf = (s: State, id: string) => s.pets.find((p) => p.id === id);

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'toast':
      return { ...s, toast: a.text };

    case 'daily/submit': {
      const first = !s.dailyDone[a.date];
      const fresh = a.entries.map((e) =>
        mkEvent(s, e.petId, 'daily', a.date, e.ok ? '每日一问：都挺好' : `每日一问：${e.issues.join('、') || '有点不对'}`, { data: { ok: e.ok, issues: e.ok ? [] : e.issues } }));
      const kept = s.events.filter((e) => !(e.type === 'daily' && e.date === a.date && a.entries.some((x) => x.petId === e.petId)));
      const sunnyDays = { ...s.sunnyDays };
      const followUp = { ...s.followUp };
      a.entries.forEach((e) => {
        if (e.ok && first) sunnyDays[e.petId] = (sunnyDays[e.petId] ?? 0) + 1;
        if (followUp[e.petId] && followUp[e.petId] <= a.date) delete followUp[e.petId];
      });
      const anyIssue = a.entries.some((e) => !e.ok);
      const bonus = first ? `，小鱼干 +${BONUS.daily}` : '';
      return {
        ...s, events: [...fresh, ...kept], sunnyDays, followUp, dailyDone: { ...s.dailyDone, [a.date]: true },
        fish: s.fish + (first ? BONUS.daily : 0), toast: anyIssue ? `谢谢告诉我${bonus}` : `都记好了${bonus}`,
      };
    }

    case 'daily/skip':
      return { ...s, dailySkipped: { ...s.dailySkipped, [a.date]: true }, toast: '好的，明天再问' };

    case 'plan/complete': {
      const p = s.plans.find((x) => x.id === a.planId);
      if (!p) return s;
      if (p.kind === 'revisit') {
        const ev = mkEvent(s, p.petId, 'visit', a.date, '复诊完成');
        return { ...s, plans: s.plans.filter((x) => x.id !== p.id), events: [ev, ...s.events], fish: s.fish + BONUS.revisit, toast: `复诊完成，小鱼干 +${BONUS.revisit}` };
      }
      if (p.kind === 'med') {
        const ev = mkEvent(s, p.petId, 'care', a.date, `${p.title} · 已喂药`, { data: { kind: 'med' } });
        return { ...s, plans: s.plans.map((x) => (x.id === p.id ? { ...x, lastDone: a.date } : x)), events: [ev, ...s.events], fish: s.fish + BONUS.med, toast: `已记录，小鱼干 +${BONUS.med}` };
      }
      const reward = completionReward(p, a.date, leadOf(s));
      const ev = mkEvent(s, p.petId, 'care', a.date, `${p.title} · 护盾充满`, { detail: a.product?.label ?? p.product, data: { kind: p.kind, onTime: reward === REWARD.onTime } });
      const toast = reward === REWARD.onTime ? `按时完成，小鱼干 +${reward}` : reward === REWARD.early ? '已记录（提前太多不加小鱼干）' : `已补录，小鱼干 +${reward}`;
      return { ...s, plans: s.plans.map((x) => (x.id === p.id ? completePlan(p, a.date, a.product) : x)), events: [ev, ...s.events], fish: s.fish + reward, toast };
    }

    case 'plans/set': {
      const kinds = new Set(a.plans.map((p) => p.kind));
      return { ...s, plans: [...s.plans.filter((p) => !(p.petId === a.petId && kinds.has(p.kind))), ...a.plans], toast: `已生成 ${a.plans.length} 项计划` };
    }

    case 'weight/add': {
      const pet = petOf(s, a.petId);
      if (!pet || !(a.kg > 0)) return s;
      const ev = mkEvent(s, a.petId, 'weight', a.date, `称重 ${a.kg} kg`, { detail: a.method === 'held' ? '抱着称' : '直接称', data: { kg: a.kg } });
      const wp = s.plans.find((p) => p.petId === a.petId && p.kind === 'weigh');
      const bonus = wp ? (completionReward(wp, a.date, leadOf(s)) === REWARD.onTime ? BONUS.weighOnTime : BONUS.weighLate) : BONUS.weighLate;
      const next: State = { ...s, events: [ev, ...s.events], plans: wp ? s.plans.map((p) => (p.id === wp.id ? completePlan(p, a.date) : p)) : s.plans, fish: s.fish + bonus };
      const t = weightTrend(petWeights(next, a.petId), a.date);
      const out = inRange(a.kg, pet.weightRange) === false;
      const toast = t.anomaly ? `近 4 周变化 ${t.changePct}%，变化较明显，建议咨询兽医` : out ? '不在兽医建议区间内，留意一下' : `记好了，小鱼干 +${bonus}`;
      return { ...next, toast };
    }

    case 'check/save': {
      if (s.checks.some((c) => c.id === a.session.id)) return s;
      const lv = LEVEL_TEXT[a.session.level];
      const ev = mkEvent(s, a.session.petId, 'check', a.session.date, `状态检测：${lv.title}`, {
        detail: [...a.session.redFlags, ...a.session.symptoms].join('、'), data: { level: a.session.level } });
      const followUp = a.session.level === 'observe' ? { ...s.followUp, [a.session.petId]: addDays(a.session.date, 1) } : s.followUp;
      return { ...s, checks: [a.session, ...s.checks], events: [ev, ...s.events], followUp };
    }

    case 'visit/backfill': {
      const meds: Plan[] = a.meds.filter((m) => m.name.trim()).map((m) => ({
        id: uid('pl'), petId: a.petId, kind: 'med', title: `${m.name.trim()} · 每天 ${m.perDay} 次`, intervalDays: 1,
        dueDate: a.date, endDate: addDays(a.date, Math.max(1, m.days) - 1) }));
      const extra: Plan[] = a.revisit ? [{ id: uid('pl'), petId: a.petId, kind: 'revisit', title: '复诊', intervalDays: 1, dueDate: a.revisit }] : [];
      const detail = [meds.length ? `用药：${meds.map((m) => m.title).join('；')}` : '', a.revisit ? `复诊 ${a.revisit}` : '', a.cost ? `费用 ${a.cost}` : ''].filter(Boolean).join(' · ');
      const ev = mkEvent(s, a.petId, 'visit', a.date, `看医生：${a.diagnosis}`, { detail });
      return { ...s, plans: [...s.plans, ...meds, ...extra], events: [ev, ...s.events], toast: `已生成 ${meds.length + extra.length} 个提醒` };
    }

    case 'visit/recovered':
      return { ...s, events: [mkEvent(s, a.petId, 'visit', a.date, '已痊愈'), ...s.events], toast: '太好了，记进时间线啦' };

    case 'moment/add': {
      const pet = petOf(s, a.petId);
      if (!pet || !a.text.trim()) return s;
      const ev = mkEvent(s, a.petId, 'moment', a.date, a.text.trim(), { visibility: a.visibility, image: a.image });
      const layer = VIS_LAYER[a.visibility];
      const posts = layer
        ? [{ id: uid('post'), author: s.nickname, look: pet.look, layer, circle: layer === 'interest' ? '同好' : layer === 'friends' ? '宠友' : '附近', text: a.text.trim(), tags: [pet.name], fish: 0, answers: 0, mine: true, ago: '刚刚', image: a.image }, ...s.posts]
        : s.posts;
      return { ...s, events: [ev, ...s.events], posts, toast: '已记进时间线' };
    }

    case 'post/add':
      return { ...s, posts: [a.post, ...s.posts], toast: '已发布' };

    case 'post/like': {
      const used = s.likesToday[a.date] ?? 0;
      const p = s.posts.find((x) => x.id === a.postId);
      if (!p || p.liked || p.mine) return s;
      if (used >= LIMITS.likesPerDay) return { ...s, toast: '今天送出的小鱼干到上限啦' };
      return { ...s, posts: s.posts.map((x) => (x.id === p.id ? { ...x, fish: x.fish + 1, liked: true } : x)), likesToday: { ...s.likesToday, [a.date]: used + 1 }, toast: `给 ${p.author} 送了 1 条小鱼干` };
    }

    case 'post/adopt':
      return { ...s, posts: s.posts.map((x) => (x.id === a.postId ? { ...x, adopted: true } : x)), toast: '已采纳，回答者获得贡献值' };

    case 'lost/create': {
      const pet = petOf(s, a.petId);
      if (!pet || s.lost.some((l) => l.petId === a.petId && !l.resolved)) return s;
      const alert = { id: uid('lost'), petId: pet.id, petName: pet.name, look: pet.look, desc: `${pet.breed} · 已生成寻宠卡（芯片号默认隐藏）`, area: '你家所在街区', since: '刚刚', radiusKm: 1, sightings: [], mine: true, resolved: false };
      return { ...s, lost: [alert, ...s.lost], pets: s.pets.map((p) => (p.id === pet.id ? { ...p, lost: true } : p)), toast: '已推送给 1 公里内的宠友和邻居' };
    }

    case 'lost/sighting': {
      const l = s.lost.find((x) => x.id === a.alertId);
      if (!l || l.mine || l.resolved) return s;
      const badges = s.badges.includes('守护者') ? s.badges : [...s.badges, '守护者'];
      return {
        ...s, lost: s.lost.map((x) => (x.id === l.id ? { ...x, sightings: [...x.sightings, { at: '刚刚', note: a.note.trim() || '看到了', by: s.nickname }] } : x)),
        fish: s.fish + BONUS.sighting, badges, toast: `线索已发给失主，小鱼干 +${BONUS.sighting}`,
      };
    }

    case 'lost/expand':
      return { ...s, lost: s.lost.map((x) => (x.id === a.alertId ? { ...x, radiusKm: 3 } : x)), toast: '推送范围已扩大到 3 公里' };

    case 'lost/resolve': {
      const l = s.lost.find((x) => x.id === a.alertId);
      if (!l) return s;
      const events = l.petId ? [mkEvent(s, l.petId, 'help', a.date, `已找回，感谢 ${l.sightings.length} 位帮忙的邻居`), ...s.events] : s.events;
      return { ...s, lost: s.lost.map((x) => (x.id === l.id ? { ...x, resolved: true } : x)), pets: s.pets.map((p) => (p.id === l.petId ? { ...p, lost: false } : p)), events, toast: '已找回，寻宠卡已下架' };
    }

    case 'walk/join': {
      const e = s.walkEvents.find((x) => x.id === a.id);
      if (!e || e.joined || e.dogs.length >= e.capacity) return s;
      return { ...s, walkEvents: s.walkEvents.map((x) => (x.id === e.id ? { ...x, joined: true } : x)), toast: `已加入「${e.when}」的局，开始前 1 小时提醒你` };
    }

    case 'walk/leave': {
      const e = s.walkEvents.find((x) => x.id === a.id);
      if (!e || !e.joined || e.mine || e.status !== 'open') return s;
      return { ...s, walkEvents: s.walkEvents.map((x) => (x.id === e.id ? { ...x, joined: false } : x)), toast: '已退出这个局' };
    }

    case 'walk/host': {
      const e: WalkEvent = { ...a.event, id: uid('we'), host: s.nickname, mine: true, geohash: s.myGeohash, dogs: [], joined: true, status: 'open' };
      return { ...s, walkEvents: [e, ...s.walkEvents], toast: '遛狗局已发起，3 公里内合适的狗主人会看到' };
    }

    case 'walk/checkin': {
      const e = s.walkEvents.find((x) => x.id === a.id);
      if (!e || !e.joined || e.status !== 'open') return s;
      const pet = petOf(s, s.walk.petId);
      const ev = pet ? [mkEvent(s, pet.id, 'walk', a.date, `参加遛狗局：${e.place}（${e.dogs.length + 1} 只狗）`, { visibility: 'friends' })] : [];
      return { ...s, walkEvents: s.walkEvents.map((x) => (x.id === e.id ? { ...x, status: 'checkedIn' } : x)), events: [...ev, ...s.events], toast: '到场打卡成功，遛完记得评价一下' };
    }

    case 'walk/rate': {
      const e = s.walkEvents.find((x) => x.id === a.id);
      if (!e || e.status !== 'checkedIn') return s;
      const good = a.rating !== 'bad';
      const friend = good && !e.mine && !s.friends.includes(e.host);
      return {
        ...s, walkEvents: s.walkEvents.map((x) => (x.id === e.id ? { ...x, status: 'rated', rating: a.rating } : x)),
        friends: friend ? [...s.friends, e.host] : s.friends,
        hiddenHosts: good || e.mine ? s.hiddenHosts : [...s.hiddenHosts, e.host],
        toast: good ? (e.mine ? '谢谢组局，下次还来' : `${e.host}已成为宠友`) : '不再推荐这位发起人的局',
      };
    }

    case 'walk/profile':
      return { ...s, walk: a.profile, toast: '遛遛卡已更新' };

    case 'home/fish': {
      const key = `${a.homeId}|${a.date}`;
      const used = s.visitsSent[key] ?? 0;
      if (used >= LIMITS.visitFishPerHomePerDay) return { ...s, toast: '今天给这家送的小鱼干到上限啦' };
      const homes = s.homes.map((h) => (h.id === a.homeId && used + 1 >= 2 ? { ...h, friend: true } : h));
      return { ...s, visitsSent: { ...s.visitsSent, [key]: used + 1 }, homes, toast: '送出 1 条小鱼干，对方会收到「谁来串门」通知' };
    }

    case 'foster/create':
      return { ...s, fosters: [{ ...a.foster, id: uid('fo'), status: 'open', checkins: [] }, ...s.fosters], toast: '托付已发出，仅宠友可见' };

    case 'foster/accept':
      return { ...s, fosters: s.fosters.map((f) => (f.id === a.id ? { ...f, status: 'accepted', helper: a.helper } : f)), toast: `${a.helper} 接下了托付` };

    case 'foster/checkin':
      return { ...s, fosters: s.fosters.map((f) => (f.id === a.id ? { ...f, checkins: [...f.checkins, { date: a.date, note: a.note }] } : f)) };

    case 'foster/done': {
      const f = s.fosters.find((x) => x.id === a.id);
      if (!f) return s;
      return {
        ...s, fosters: s.fosters.map((x) => (x.id === f.id ? { ...x, status: 'done', rating: a.rating } : x)),
        events: [mkEvent(s, f.petId, 'help', a.date, `被${f.helper ?? '宠友'}照顾的 ${f.checkins.length} 天`), ...s.events], fish: s.fish + BONUS.fosterDone,
        toast: `托付完成，信任分 +1，小鱼干 +${BONUS.fosterDone}`,
      };
    }

    case 'pet/add':
      return { ...s, pets: [...s.pets, a.pet], toast: `${a.pet.name}入住啦` };

    case 'pet/update':
      return { ...s, pets: s.pets.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };

    case 'member/add': {
      const name = a.name.trim();
      if (!name) return s;
      return { ...s, members: [...s.members, { id: uid('m'), name }], toast: `${name}已加入「${s.nickname}的家」` };
    }

    case 'member/switch':
      return { ...s, me: a.id };

    case 'settings/update':
      return { ...s, settings: { ...s.settings, ...a.patch } };

    case 'nickname/update':
      return a.name.trim() ? { ...s, nickname: a.name.trim() } : s;

    case 'state/replace':
      return a.state;
  }
}

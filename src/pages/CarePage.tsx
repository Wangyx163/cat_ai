import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { asset, KIND_ICON, petImage, RATIO } from '../components/assets';
import { CompleteSheet } from '../components/CompleteSheet';
import { Icon } from '../components/icons';
import { Sparkline } from '../components/Sparkline';
import { Avatar, Btn, Card, Empty, FishPill, Tag } from '../components/ui';
import { WeighSheet } from '../components/WeighSheet';
import { diffDays, fmtMD, fmtYM, parseISO, type ISODate } from '../domain/dates';
import { SHIELD_KINDS, SHIELD_TITLE, shieldInfo, type ShieldState } from '../domain/shield';
import { petWeights } from '../domain/summary';
import type { Plan, PlanKind } from '../domain/types';
import { inRange, weighStreak, weightTrend } from '../domain/weight';
import { findPet, leadOf } from '../store/selectors';
import { useStore } from '../store/StoreContext';

export const periodText = (n: number) => (n >= 300 ? '每年一次' : n >= 170 ? '每半年一次' : n >= 80 ? '约 3 个月一次' : n >= 25 ? '每月一次' : n === 7 ? '每周一次' : n === 1 ? '每天' : `每 ${n} 天`);
const dueText = (due: ISODate, today: ISODate) => (parseISO(due).getFullYear() !== parseISO(today).getFullYear() ? fmtYM(due) : fmtMD(due));
const STATE_TAG: Record<ShieldState, [string, string]> = { safe: ['安全', 'green'], soon: ['快到期', 'amber'], over: ['逾期', 'coral-solid'], unknown: ['待确认', 'muted'] };

function ShieldTile({ kind, plan, petId, today, onDo, primary }: { kind: PlanKind; plan?: Plan; petId: string; today: ISODate; onDo: (p: Plan) => void; primary: boolean }) {
  const { state } = useStore();
  const info = plan ? shieldInfo(plan, today, leadOf(state)) : { state: 'unknown' as const };
  const [label, tone] = STATE_TAG[info.state];
  return (
    <div className={`shield shield--${info.state}`}>
      <div className="row"><span className="shield__icon"><img src={asset(KIND_ICON[kind])} alt="" /></span><b className="grow">{SHIELD_TITLE[kind]}</b></div>
      <Tag tone={tone}>{plan ? label : '未设置'}</Tag>
      {info.state === 'safe' && <><div className="shield__main">下次 {dueText(info.due!, today)}</div><small className="muted">{periodText(plan!.intervalDays)}</small>
        <Btn size="sm" kind="text" onClick={() => onDo(plan!)}>提前记录</Btn></>}
      {info.state === 'soon' && <><div className="shield__main shield__main--big num">{info.daysLeft === 0 ? '今天到期' : `还剩 ${info.daysLeft} 天`}</div>
        <small className="muted">{plan!.lastDone ? `上次 ${fmtMD(plan!.lastDone)} · ` : ''}{periodText(plan!.intervalDays)}</small>
        <Btn size="sm" full kind={primary ? 'primary' : 'secondary'} onClick={() => onDo(plan!)}>打卡</Btn></>}
      {info.state === 'over' && <><div className="shield__main shield__main--big num">逾期 {-(info.daysLeft ?? 0)} 天</div><small className="muted">补录即恢复</small>
        <Btn size="sm" full kind={primary ? 'primary' : 'secondary'} onClick={() => onDo(plan!)}>补录</Btn></>}
      {info.state === 'unknown' && <><div className="shield__main">{plan ? '不记得上次时间' : '还没有计划'}</div><small className="muted">建议尽快补上</small>
        <Btn size="sm" full kind="secondary" to={`/plan/${petId}`}>去补全</Btn></>}
    </div>
  );
}

export default function CarePage() {
  const { state, dispatch, today } = useStore();
  const [sp, setSp] = useSearchParams();
  const petId = sp.get('pet') && findPet(state, sp.get('pet') ?? '') ? (sp.get('pet') as string) : state.pets[0]?.id ?? '';
  const pet = findPet(state, petId);
  const [completing, setCompleting] = useState<Plan | null>(null);
  const setParam = (k: string, v?: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  if (!pet) return <div className="page"><h1 className="display page-title">养护乐园</h1><Empty img="empty_timeline" title="先让一只毛孩子入住吧"><Btn to="/onboarding">去添加</Btn></Empty></div>;

  const plans = state.plans.filter((p) => p.petId === petId);
  const shields = SHIELD_KINDS.map((k) => ({ kind: k, plan: plans.find((p) => p.kind === k) }));
  const infos = shields.map((s) => (s.plan ? shieldInfo(s.plan, today, leadOf(state)).state : 'unknown'));
  const firstAction = infos.findIndex((x) => x === 'over' || x === 'soon');
  const safeN = infos.filter((x) => x === 'safe').length;
  const points = petWeights(state, petId);
  const trend = weightTrend(points, today);
  const weighPlan = plans.find((p) => p.kind === 'weigh');
  const streak = weighStreak(points, weighPlan?.intervalDays ?? 30, today);
  const range = inRange(trend.last ?? 0, pet.weightRange);
  const others = plans.filter((p) => !SHIELD_KINDS.includes(p.kind));
  const petImg = petImage(pet.look, 'calm');

  return (
    <div className="page">
      <header className="home-head"><h1 className="display grow">养护乐园</h1><FishPill n={state.fish} /></header>
      <div className="pet-switch" role="tablist" aria-label="选择宠物">
        {state.pets.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={p.id === petId} className={`pet-switch__item${p.id === petId ? ' pet-switch__item--on' : ''}`} onClick={() => setParam('pet', p.id)}>
            <Avatar look={p.look} size={40} tone={p.id === petId ? 'white' : 'sky'} />{p.name}
          </button>
        ))}
      </div>
      <Card>
        <div className="row"><img src={asset('obj_medkit')} alt="" width={30} height={31} /><h2 className="h2 grow">{pet.name}的护盾</h2>
          <small className="muted">{safeN} 项安全{infos.length - safeN ? ` · ${infos.length - safeN} 项要处理` : ''}</small></div>
        <div className="grid2">
          {shields.map((s, i) => <ShieldTile key={s.kind} kind={s.kind} plan={s.plan} petId={petId} today={today} onDo={setCompleting} primary={i === firstAction} />)}
        </div>
      </Card>
      <Card>
        <div className="row"><h2 className="h2 grow">体重小秤</h2>{streak >= 2 && <Tag tone="amber" icon="medal">连续按时称重 {streak} 次</Tag>}</div>
        <div className="row weigh">
          <div className="weigh__stage">
            <img className="weigh__scale" src={asset('obj_scale')} alt="体重秤" style={{ aspectRatio: String(RATIO.obj_scale) }} />
            <img className="weigh__pet" src={petImg.src} alt={`${pet.name}站在秤上`} style={{ aspectRatio: String(petImg.ratio) }} />
          </div>
          <div className="grow stack-sm">
            <div><span className="num big">{trend.last ?? '--'}</span> <span>kg</span></div>
            <small className="muted">
              {trend.last !== undefined && trend.prev !== undefined ? `比上次 ${trend.last - trend.prev >= 0 ? '+' : ''}${(Math.round((trend.last - trend.prev) * 10) / 10).toFixed(1)} kg` : '还没有上一次记录'}
              {range === true ? ' · 在区间内' : range === false ? ' · 不在建议区间' : ''}
            </small>
            {weighPlan && <small className="muted">{periodText(weighPlan.intervalDays)}称一次</small>}
          </div>
        </div>
        {trend.anomaly && <div className="note note--amber"><Icon name="alert" size={18} />近 4 周变化 {trend.changePct}%，变化较明显，建议咨询兽医</div>}
        <Sparkline points={points} range={pet.weightRange} />
        <div className="row"><small className="muted grow">{pet.weightRange ? '绿色带为兽医建议区间' : '还没设置兽医建议区间，只看趋势'}</small>
          <Btn size="sm" kind="secondary" onClick={() => setParam('weigh', '1')}>开始称重</Btn></div>
      </Card>
      {others.length > 0 && (
        <Card>
          <h2 className="h2">其他计划</h2>
          {others.map((p) => {
            const info = shieldInfo(p, today, leadOf(state));
            const sub = p.kind === 'med' ? `用到 ${p.endDate ? fmtMD(p.endDate) : '按医嘱'}` : p.kind === 'revisit' && p.dueDate ? `${fmtMD(p.dueDate)} 复诊（${diffDays(p.dueDate, today) >= 0 ? `还有 ${diffDays(p.dueDate, today)} 天` : '已过期'}）` : info.due ? `下次 ${fmtMD(info.due)} · ${periodText(p.intervalDays)}` : '待确认';
            return <div key={p.id} className="list-row"><b className="grow">{p.title}</b><small className="muted">{sub}</small></div>;
          })}
        </Card>
      )}
      <Card>
        <div className="row"><h2 className="h2 grow">检测与就诊</h2><Btn size="sm" kind="secondary" icon="heart" to={`/check/${petId}`}>状态检测</Btn></div>
        {state.checks.filter((c) => c.petId === petId).map((c) => (
          <div key={c.id} className="list-row"><b className="grow">{fmtMD(c.date)} 状态检测</b><Tag>{c.level === 'emergency' ? '建议尽快就医' : c.level === 'appointment' ? '建议预约' : '先观察'}</Tag></div>
        ))}
        {state.events.filter((e) => e.petId === petId && e.type === 'visit').map((e) => (
          <div key={e.id} className="list-row"><b className="grow">{fmtMD(e.date)} {e.title}</b><small className="muted">{e.detail}</small></div>
        ))}
        {!state.checks.some((c) => c.petId === petId) && !state.events.some((e) => e.petId === petId && e.type === 'visit') && <p className="muted">还没有检测和就诊记录</p>}
        {state.events.some((e) => e.petId === petId && e.type === 'visit' && e.title.startsWith('看医生') && diffDays(today, e.date) <= 30) && (
          <Btn kind="secondary" full onClick={() => dispatch({ type: 'visit/recovered', petId, date: today })}>标记已痊愈</Btn>
        )}
      </Card>
      <Btn kind="secondary" icon="calendar" to={`/plan/${petId}`} full>计划与日历</Btn>
      <CompleteSheet plan={completing} onClose={() => setCompleting(null)} />
      <WeighSheet petId={petId} open={sp.get('weigh') === '1'} onClose={() => setParam('weigh')} />
    </div>
  );
}

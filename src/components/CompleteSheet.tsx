import { useEffect, useState } from 'react';
import { addDays, fmtMD } from '../domain/dates';
import { stageOf, templateFor } from '../domain/planTemplate';
import { completionReward, nextDue, REWARD } from '../domain/shield';
import type { Plan } from '../domain/types';
import { findPet, leadOf } from '../store/selectors';
import { useStore } from '../store/StoreContext';
import { Btn, Chip, Sheet } from './ui';

/** 打卡：点选实际日期和所用产品 → 下次到期 = 实际日期 + 周期 */
export function CompleteSheet({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const [offset, setOffset] = useState(0);
  const [custom, setCustom] = useState('');
  const [prod, setProd] = useState<number | undefined>(undefined);
  useEffect(() => { setOffset(0); setCustom(''); setProd(undefined); }, [plan?.id]);
  if (!plan) return null;
  const pet = findPet(state, plan.petId);
  const products = pet ? templateFor(pet.species, stageOf(pet.birthday, today)).find((t) => t.kind === plan.kind)?.products : undefined;
  const date = custom || addDays(today, -offset);
  const product = products && prod !== undefined ? products[prod] : undefined;
  const reward = plan.kind === 'med' ? 1 : completionReward(plan, date, leadOf(state));
  const nextAfter = addDays(date, product?.days ?? plan.intervalDays);
  const due = nextDue(plan);
  return (
    <Sheet open onClose={onClose} title={`${pet?.name ?? ''} · ${plan.title}`}>
      <span className="label">实际是哪天做的？</span>
      <div className="row row--wrap">
        {['今天', '昨天', '前天'].map((l, i) => <Chip key={l} on={!custom && offset === i} onClick={() => { setCustom(''); setOffset(i); }}>{l}</Chip>)}
        <label className="date-chip">
          <span className="sr-only">选择其他日期</span>
          <input type="date" max={today} value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
      </div>
      {products && (
        <>
          <span className="label">用的是哪类产品？</span>
          <div className="row row--wrap">
            {products.map((p, i) => <Chip key={p.label} on={prod === i} onClick={() => setProd(i)}>{p.label}</Chip>)}
          </div>
        </>
      )}
      <div className="note note--green">
        {due && <span>原定 {fmtMD(due)} 到期 · </span>}
        <span>记录后下次到期：<b>{fmtMD(nextAfter)}</b></span>
        <span className="muted"> · {plan.kind === 'med' ? '小鱼干 +1' : reward === REWARD.onTime ? '按时完成 +10' : reward === REWARD.early ? '提前太多不加小鱼干' : `补录 +${reward}`}</span>
      </div>
      <p className="hint">周期为默认值，请以兽医医嘱为准。</p>
      <Btn full onClick={() => { dispatch({ type: 'plan/complete', planId: plan.id, date, product }); onClose(); }}>确认已完成</Btn>
    </Sheet>
  );
}

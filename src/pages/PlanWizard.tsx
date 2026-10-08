import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/icons';
import { Avatar, Btn, Card, Chip, KindIcon, Progress, Tag, TopBar } from '../components/ui';
import { ageText, fmtMD, fmtYM } from '../domain/dates';
import { buildPlans, LAST_BUCKETS, STAGE_NAME, stageOf, templateFor, type PlanPick } from '../domain/planTemplate';
import { shieldInfo } from '../domain/shield';
import type { Pet, Plan } from '../domain/types';
import { uid } from '../store/reducer';
import { findPet, leadOf } from '../store/selectors';
import { useStore } from '../store/StoreContext';
import { periodText } from './CarePage';

const LIFESTYLE: Record<NonNullable<Pet['lifestyle']>, string> = { indoor: '只在室内', outdoor: '会出门', multi: '多宠同住' };
const KEEP = -1;

/** 计划模板：能从档案带入的不再问，其余全部点选；首次需要提醒时再来补 */
export default function PlanWizard() {
  const { petId } = useParams();
  const { state, dispatch, today } = useStore();
  const nav = useNavigate();
  const [chosen, setChosen] = useState(petId ?? '');
  const [step, setStep] = useState(petId ? 1 : 0);
  const pet = findPet(state, chosen);
  const stage = pet ? stageOf(pet.birthday, today) : 'adult';
  const items = useMemo(() => (pet ? templateFor(pet.species, stage) : []), [pet, stage]);
  const existing = (kind: string) => state.plans.find((p) => p.petId === chosen && p.kind === kind);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [last, setLast] = useState<Record<string, number>>({});
  const [prod, setProd] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!pet) return;
    setOn(Object.fromEntries(items.map((i) => [i.kind, i.defaultOn || !!existing(i.kind)])));
    setLast(Object.fromEntries(items.filter((i) => i.askLast).map((i) => [i.kind, existing(i.kind)?.lastDone ? KEEP : 2])));
    setProd(Object.fromEntries(items.filter((i) => i.products).map((i) => {
      const idx = i.products!.findIndex((p) => p.label === existing(i.kind)?.product);
      return [i.kind, idx >= 0 ? idx : 0];
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet?.id, items]);

  const picked = items.filter((i) => on[i.kind]);
  const preview: Plan[] = useMemo(() => {
    if (!pet) return [];
    const fresh = picked.filter((i) => last[i.kind] !== KEEP || !i.askLast);
    const built = buildPlans(pet.id, items, fresh.map((i): PlanPick => ({ kind: i.kind, last: last[i.kind], product: prod[i.kind] })), today, () => uid('pl'));
    const kept = picked.filter((i) => i.askLast && last[i.kind] === KEEP).map((i) => {
      const ex = existing(i.kind)!;
      const p = i.products?.[prod[i.kind]];
      return { ...ex, intervalDays: p && p.label !== '不确定' ? p.days : ex.intervalDays, product: p?.label ?? ex.product };
    });
    return [...kept, ...built];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet, items, on, last, prod, today]);

  const generate = () => {
    if (!pet) return;
    dispatch({ type: 'plans/set', petId: pet.id, plans: preview });
    nav(`/care?pet=${pet.id}`);
  };

  return (
    <div className="page page--cool">
      <TopBar title="补全养护计划" right={<small className="muted">{step} / 4</small>} />
      <Progress value={(step / 4) * 100} />
      {step === 0 && (
        <section className="stack">
          <h2 className="h2">给谁做计划？</h2>
          {state.pets.map((p) => (
            <button key={p.id} type="button" className={`pick-row${chosen === p.id ? ' pick-row--on' : ''}`} onClick={() => setChosen(p.id)}>
              <Avatar look={p.look} size={44} /><b className="grow">{p.name}</b>{chosen === p.id && <Icon name="check" />}
            </button>
          ))}
          <Btn full disabled={!pet} onClick={() => setStep(1)}>下一步</Btn>
        </section>
      )}
      {pet && step === 1 && (
        <section className="stack">
          <div className="row row--wrap"><Avatar look={pet.look} size={44} /><b>{pet.name}</b>
            <Tag>{pet.species === 'cat' ? '猫' : '狗'}</Tag><Tag>{pet.birthday ? ageText(pet.birthday, today) : '年龄未填'}</Tag><Tag>{STAGE_NAME[stage]}</Tag>
            {pet.lifestyle && <Tag>{LIFESTYLE[pet.lifestyle]}</Tag>}</div>
          <p className="muted">物种、年龄阶段已从档案带入，不用再选。</p>
          {!pet.lifestyle && (
            <Card line>
              <h3 className="h3">平时的生活方式？</h3>
              <div className="row row--wrap">
                {(Object.keys(LIFESTYLE) as NonNullable<Pet['lifestyle']>[]).map((k) => (
                  <Chip key={k} on={pet.lifestyle === k} onClick={() => dispatch({ type: 'pet/update', id: pet.id, patch: { lifestyle: k } })}>{LIFESTYLE[k]}</Chip>
                ))}
              </div>
            </Card>
          )}
          <Btn full onClick={() => setStep(2)}>下一步：选项目</Btn>
        </section>
      )}
      {pet && step === 2 && (
        <section className="stack">
          <h2 className="h2">要管理哪些项目？</h2>
          <p className="muted">已按物种和年龄默认勾好，点一下即可增减。</p>
          <div className="grid2">
            {items.map((i) => (
              <button key={i.kind} type="button" aria-pressed={!!on[i.kind]} className={`plan-item${on[i.kind] ? ' plan-item--on' : ''}`} onClick={() => setOn({ ...on, [i.kind]: !on[i.kind] })}>
                <KindIcon kind={i.kind} fallback={i.icon} /><span className="grow"><b>{i.title}</b><small>{i.period}</small></span>
                <span className="plan-item__check">{on[i.kind] && <Icon name="check" size={14} stroke={2.8} />}</span>
              </button>
            ))}
          </div>
          <div className="row"><Btn kind="secondary" className="grow" onClick={() => setStep(1)}>上一步</Btn><Btn className="grow" disabled={!picked.length} onClick={() => setStep(3)}>下一步</Btn></div>
        </section>
      )}
      {pet && step === 3 && (
        <section className="stack">
          <h2 className="h2">上次是什么时候？</h2>
          {picked.filter((i) => i.askLast || i.products).map((i) => (
            <Card line key={i.kind}>
              <div className="row"><KindIcon kind={i.kind} fallback={i.icon} /><b>{i.title}</b></div>
              {i.askLast && (
                <div className="row row--wrap">
                  {existing(i.kind)?.lastDone && <Chip on={last[i.kind] === KEEP} onClick={() => setLast({ ...last, [i.kind]: KEEP })}>沿用记录（{fmtMD(existing(i.kind)!.lastDone!)}）</Chip>}
                  {LAST_BUCKETS.map((b, bi) => <Chip key={b.label} on={last[i.kind] === bi} onClick={() => setLast({ ...last, [i.kind]: bi })}>{b.label}</Chip>)}
                </div>
              )}
              {i.products && (
                <>
                  <small className="muted">用的是哪类产品？决定周期</small>
                  <div className="row row--wrap">
                    {i.products.map((p, pi) => <Chip key={p.label} on={prod[i.kind] === pi} onClick={() => setProd({ ...prod, [i.kind]: pi })}>{p.label}</Chip>)}
                  </div>
                </>
              )}
            </Card>
          ))}
          <p className="hint">周期为模板默认值，请以兽医医嘱为准，可随时修改。</p>
          <div className="row"><Btn kind="secondary" className="grow" onClick={() => setStep(2)}>上一步</Btn><Btn className="grow" onClick={() => setStep(4)}>预览</Btn></div>
        </section>
      )}
      {pet && step === 4 && (
        <section className="stack">
          <h2 className="h2">生成后是这样</h2>
          <Card line>
            {preview.map((p) => {
              const info = shieldInfo(p, today, leadOf(state));
              return (
                <div key={p.id} className="list-row">
                  <b className="grow">{p.title}</b>
                  <small className="muted">{info.state === 'unknown' ? '待确认，建议尽快补做' : `下次 ${info.due && info.due.slice(0, 4) !== today.slice(0, 4) ? fmtYM(info.due) : fmtMD(info.due!)} · ${periodText(p.intervalDays)}`}</small>
                </div>
              );
            })}
          </Card>
          <div className="row"><Btn kind="secondary" className="grow" onClick={() => setStep(3)}>上一步</Btn><Btn className="grow" onClick={generate}>生成计划</Btn></div>
        </section>
      )}
    </div>
  );
}

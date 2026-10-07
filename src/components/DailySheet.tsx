import { useEffect, useState } from 'react';
import type { DailyEntry } from '../domain/types';
import { DAILY_ISSUES, WEATHER_NAME, weatherLevel, weatherScore } from '../domain/weather';
import { petWeather } from '../store/selectors';
import { useStore } from '../store/StoreContext';
import { asset } from './assets';
import { Avatar, Btn, Chip, Sheet, WeatherBadge } from './ui';
import { greeting } from './util';

type Draft = Record<string, { ok: boolean | null; issues: string[] }>;

/** 每日一问：一天一次；都挺好一键完成，不对劲才展开多选。奖励与回答内容无关 */
export function DailySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => {
    if (open) setDraft(Object.fromEntries(state.pets.map((p) => [p.id, { ok: null, issues: [] }])));
  }, [open, state.pets]);
  const set = (id: string, v: Draft[string]) => setDraft((d) => ({ ...d, [id]: v }));
  const ready = state.pets.length > 0 && state.pets.every((p) => draft[p.id]?.ok === true || (draft[p.id]?.ok === false && draft[p.id].issues.length > 0));
  const submit = () => {
    const entries: DailyEntry[] = state.pets.map((p) => ({ petId: p.id, ok: !!draft[p.id]?.ok, issues: draft[p.id]?.issues ?? [] }));
    dispatch({ type: 'daily/submit', date: today, entries });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={`${greeting()}！今天大家怎么样？`}>
      <p className="muted">都挺好就点一下；不对劲再说说哪里不对。</p>
      <Btn kind="secondary" size="sm" onClick={() => setDraft(Object.fromEntries(state.pets.map((p) => [p.id, { ok: true, issues: [] }])))}>一键：大家都挺好</Btn>
      {state.pets.map((p) => {
        const d = draft[p.id] ?? { ok: null, issues: [] };
        const w = petWeather(state, p.id, today);
        const anomaly = w.reasons.includes('体重变化明显');
        const overdue = w.reasons.includes('护盾逾期');
        const preview = weatherLevel(weatherScore(d.ok ? [] : d.issues, { overdue, weightAnomaly: anomaly }));
        const follow = state.followUp[p.id] && state.followUp[p.id] <= today;
        return (
          <div key={p.id} className="daily-row">
            <div className="row">
              <Avatar look={p.look} size={48} />
              <b className="grow">{p.name}</b>
              <Chip on={d.ok === true} onClick={() => set(p.id, { ok: true, issues: [] })}>都挺好</Chip>
              <Chip on={d.ok === false} onClick={() => set(p.id, { ok: false, issues: d.issues })}>有点不对</Chip>
            </div>
            {follow && <p className="hint">昨天说先观察：{p.name}今天好些了吗？好些了就点「都挺好」。</p>}
            {d.ok === false && (
              <div className="daily-panel">
                <span className="label">{p.name}哪里不对？可多选</span>
                <div className="row row--wrap">
                  {DAILY_ISSUES.map((i) => (
                    <Chip key={i} on={d.issues.includes(i)} onClick={() => set(p.id, { ok: false, issues: d.issues.includes(i) ? d.issues.filter((x) => x !== i) : [...d.issues, i] })}>{i}</Chip>
                  ))}
                </div>
                {d.issues.length > 0 && <div className="row"><WeatherBadge w={preview} size={26} /><span>今日天气：<b>{WEATHER_NAME[preview]}</b></span></div>}
              </div>
            )}
          </div>
        );
      })}
      <p className="hint row"><img src={asset('icon_fish')} alt="" width={26} height={12} />如实记录就好：不管好不好，打卡都算数，小鱼干 +1</p>
      <Btn full disabled={!ready} onClick={submit}>记好了</Btn>
      <Btn kind="text" full onClick={() => { dispatch({ type: 'daily/skip', date: today }); onClose(); }}>今天先不</Btn>
    </Sheet>
  );
}

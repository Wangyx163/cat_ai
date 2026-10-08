import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CompleteSheet } from '../components/CompleteSheet';
import { DailySheet } from '../components/DailySheet';
import { Icon } from '../components/icons';
import { Scene } from '../components/Scene';
import { Avatar, Btn, Card, Empty, FishPill, IconBtn, WeatherBadge } from '../components/ui';
import { WeighSheet } from '../components/WeighSheet';
import { shieldInfo } from '../domain/shield';
import type { Plan } from '../domain/types';
import { deriveTasks, findPet, leadOf, petWeather, type PetWeather, type Task } from '../store/selectors';
import { useStore } from '../store/StoreContext';

export default function HomePage() {
  const { state, dispatch, today } = useStore();
  const [daily, setDaily] = useState(false);
  const [completing, setCompleting] = useState<Plan | null>(null);
  const [weighPet, setWeighPet] = useState('');
  const weathers: Record<string, PetWeather> = Object.fromEntries(state.pets.map((p) => [p.id, petWeather(state, p.id, today)]));
  const tasks = deriveTasks(state, today);
  const dailyPending = state.pets.length > 0 && !state.dailyDone[today] && !state.dailySkipped[today];
  const sick = state.pets.filter((p) => weathers[p.id].level === 'rain' || weathers[p.id].level === 'alert')
    .sort((a, b) => weathers[a.id].score - weathers[b.id].score);
  const head = (
    <header className="home-head">
      <div className="grow">
        <h1 className="display">{state.nickname}的家</h1>
        <span className="muted">{state.pets.length} 只毛孩子 · 今天还有 {tasks.length + (dailyPending ? 1 : 0)} 件小事</span>
      </div>
      <FishPill n={state.fish} />
      <IconBtn icon="bell" label="消息与设置" to="/me" />
    </header>
  );
  if (!state.pets.length) {
    return (
      <div className="page">{head}
        <Empty img="empty_timeline" title="家里还没有毛孩子"><Btn to="/onboarding">让第一只毛孩子入住</Btn></Empty>
      </div>
    );
  }
  const action = (t: Task, primary: boolean) => {
    const plan = state.plans.find((p) => p.id === t.planId);
    switch (t.action) {
      case 'complete': return <Btn size="sm" kind={primary ? 'primary' : 'secondary'} onClick={() => setCompleting(plan ?? null)}>{t.urgent ? '补录' : '打卡'}</Btn>;
      case 'weigh': return <Btn size="sm" kind="secondary" onClick={() => setWeighPet(t.petId)}>去称重</Btn>;
      case 'med': return <Btn size="sm" kind="secondary" onClick={() => dispatch({ type: 'plan/complete', planId: t.planId, date: today })}>已喂药</Btn>;
      case 'revisit': return <Btn size="sm" kind="secondary" onClick={() => dispatch({ type: 'plan/complete', planId: t.planId, date: today })}>已复诊</Btn>;
      case 'plan': return <Btn size="sm" kind="secondary" to={`/plan/${t.petId}`}>去补全</Btn>;
    }
  };
  return (
    <div className="page">
      {head}
      <Scene pets={state.pets} weathers={weathers} status={(() => {
        const wt = tasks.find((t) => t.action === 'weigh');
        const ct = tasks.find((t) => t.action === 'complete');
        const plan = ct ? state.plans.find((p) => p.id === ct.planId) : undefined;
        const si = plan ? shieldInfo(plan, today, leadOf(state)) : undefined;
        return {
          weigh: wt ? findPet(state, wt.petId)?.name : undefined,
          shield: plan && si ? { label: `${findPet(state, plan.petId)?.name ?? ''}的${plan.title}`, days: si.daysLeft ?? 0, over: si.state === 'over' } : undefined,
          plan: tasks.some((t) => t.action === 'plan'),
        };
      })()} />
      {sick.map((p) => {
        const w = weathers[p.id];
        return (
          <Link key={p.id} className={`notice notice--${w.level === 'alert' ? 'coral' : 'sky'}`} to={`/check/${p.id}`}>
            <WeatherBadge w={w.level} size={30} />
            <span className="grow"><b>{p.name}今天{w.level === 'alert' ? '需要尽快就医' : '有点不舒服'}</b><br />
              <span className="muted">{w.reasons.join('、')} · 做个状态检测</span></span>
            <Icon name="chev" size={20} />
          </Link>
        );
      })}
      {dailyPending && (
        <button type="button" className="daily-card" onClick={() => setDaily(true)}>
          <span className="icircle icircle--amber"><Icon name="sun" /></span>
          <span className="grow"><b>今天的每日一问</b><small>都挺好点一下就行 · 每天 {state.settings.dailyTime} 提醒一次</small></span>
          <Icon name="chev" size={20} />
        </button>
      )}
      <Card className="tasks">
        <div className="row"><h2 className="grow h2">今天的小事</h2><Link className="link" to="/care">全部护盾</Link></div>
        {tasks.length === 0 && <p className="muted">今天没有待办，陪它们玩一会儿吧。</p>}
        {tasks.map((t, i) => {
          const pet = findPet(state, t.petId);
          return (
            <div key={t.id} className="task">
              {pet && <Avatar look={pet.look} size={44} tone={t.urgent ? 'coral' : 'orange'} />}
              <div className="grow"><b>{t.title}</b><small className={t.urgent ? 'danger' : 'muted'}>{t.sub}</small></div>
              {action(t, i === 0)}
            </div>
          );
        })}
      </Card>
      <DailySheet open={daily} onClose={() => setDaily(false)} />
      <CompleteSheet plan={completing} onClose={() => setCompleting(null)} />
      <WeighSheet petId={weighPet} open={!!weighPet} onClose={() => setWeighPet('')} />
    </div>
  );
}

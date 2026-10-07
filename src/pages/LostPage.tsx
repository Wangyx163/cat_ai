import { useState } from 'react';
import { petImage } from '../components/assets';
import { SightingSheet } from '../components/SightingSheet';
import { Btn, Card, Chip, Tag, TopBar } from '../components/ui';
import type { LostAlert } from '../domain/types';
import { useStore } from '../store/StoreContext';
import { LostCard } from './CirclePage';

/** 走失求助：先动员附近的人；24 小时没线索可扩大到 3 公里；找回后寻宠卡自动下架 */
export default function LostPage() {
  const { state, dispatch, today } = useStore();
  const [seeing, setSeeing] = useState<LostAlert | null>(null);
  const [pick, setPick] = useState('');
  const mine = state.lost.filter((l) => l.mine && !l.resolved);
  const others = state.lost.filter((l) => !l.mine && !l.resolved);
  const done = state.lost.filter((l) => l.resolved);
  return (
    <div className="page">
      <TopBar title="走失互助" back="/circle" />
      {mine.map((l) => (
        <Card key={l.id} tone="coral">
          <div className="row">{l.look && <img className="lost__img" src={petImage(l.look, 'calm').src} alt={l.petName} />}
            <div className="grow"><b>我的寻宠卡 · {l.petName}</b><br /><small className="muted">推送范围 {l.radiusKm} 公里 · {l.desc}</small></div></div>
          {l.sightings.length ? l.sightings.map((s, i) => <div key={i} className="list-row"><b className="grow">{s.by}：{s.note}</b><small className="muted">{s.at}</small></div>) : <small className="muted">还没有线索，邻居看到会第一时间通知你。</small>}
          <div className="row">
            {l.radiusKm < 3 && <Btn size="sm" kind="secondary" className="grow" onClick={() => dispatch({ type: 'lost/expand', alertId: l.id })}>扩大到 3 公里</Btn>}
            <Btn size="sm" className="grow" onClick={() => dispatch({ type: 'lost/resolve', alertId: l.id, date: today })}>已找回</Btn>
          </div>
        </Card>
      ))}
      <Card line>
        <b>我的宠物走丢了</b>
        <small className="muted">从档案一键生成寻宠卡（近照、特征），推送给 1 公里内的宠友和邻居；芯片号默认隐藏。</small>
        <div className="row row--wrap">{state.pets.filter((p) => !p.lost).map((p) => <Chip key={p.id} on={pick === p.id} onClick={() => setPick(p.id)}>{p.name}</Chip>)}</div>
        <Btn kind="danger" full disabled={!pick} onClick={() => { dispatch({ type: 'lost/create', petId: pick }); setPick(''); }}>发起走失求助</Btn>
      </Card>
      <h2 className="h2">附近的求助</h2>
      {others.length ? others.map((l) => <LostCard key={l.id} l={l} onSee={setSeeing} />) : <p className="muted">附近暂时没有求助。</p>}
      {done.length > 0 && <><h2 className="h2">已找回</h2>{done.map((l) => <div key={l.id} className="list-row"><b className="grow">{l.petName}</b><Tag tone="green">已找回</Tag></div>)}</>}
      {state.badges.includes('守护者') && <p className="hint">你已获得「守护者」徽章，谢谢你帮邻居找宠物。</p>}
      <SightingSheet alert={seeing} onClose={() => setSeeing(null)} />
    </div>
  );
}

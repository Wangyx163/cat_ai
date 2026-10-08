import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { asset } from '../components/assets';
import { Icon } from '../components/icons';
import { Avatar, Btn, Card, Chip, Empty, Tag, TopBar } from '../components/ui';
import { distanceLabel } from '../domain/geo';
import { rankEvents, sizesText, VIBES, type RankedEvent } from '../domain/match';
import { shieldInfo } from '../domain/shield';
import type { Look, Size, WalkEvent } from '../domain/types';
import { findPet, leadOf } from '../store/selectors';
import { useStore } from '../store/StoreContext';

const WHEN = [{ label: '今晚 19:30', slot: '工作日晚上' }, { label: '明早 7:30', slot: '工作日早上' }, { label: '周六 9:00', slot: '周末上午' }, { label: '周日 16:00', slot: '周末下午' }];
const PLACES = [{ name: '滨河公园东门草坪', sub: '1 公里内 · 有草坪和饮水点' }, { name: '城西公园宠物区', sub: '3 公里内 · 有围栏' }, { name: '望江街区口袋公园', sub: '1 公里内 · 适合小型犬' }];
const SIZE_OPTS: { label: string; sizes: Size[] }[] = [{ label: '不限体型', sizes: ['S', 'M', 'L'] }, { label: '小型犬', sizes: ['S'] }, { label: '中小型', sizes: ['S', 'M'] }, { label: '大型犬', sizes: ['L'] }];
type Filter = 'all' | 'tonight' | 'weekend' | 'near';
const FILTERS: Record<Filter, string> = { all: '全部', tonight: '今晚', weekend: '周末', near: '离我近' };
const RATE = [['great', '玩得开心'], ['ok', '还不错'], ['bad', '不太合适']] as const;

function TimeBox({ when }: { when: string }) {
  const [day, time] = when.split(' ');
  return <div className="timebox"><small>{day}</small><b className="num">{time}</b></div>;
}
function Dogs({ looks }: { looks: Look[] }) {
  return <span className="dogs">{looks.map((l, i) => <Avatar key={i} look={l} size={28} tone="orange" />)}</span>;
}

function EventCard({ r, primary }: { r: RankedEvent; primary: boolean }) {
  const { dispatch } = useStore();
  const e = r.e;
  return (
    <Card className="event">
      <div className="row event__top">
        <TimeBox when={e.when} />
        <div className="grow"><b>{e.place}</b><small className="muted">{e.host}发起 · {sizesText(e.sizes)} · {e.vibe}</small></div>
        <Tag tone="sky-strong">匹配 {r.score}%</Tag>
      </div>
      <div className="row"><Dogs looks={e.dogs.map((d) => d.look)} /><small className="muted grow">已有 {e.dogs.length} 只 · 上限 {e.capacity}</small><Tag icon="pin">{distanceLabel(r.km)}</Tag></div>
      <Btn size="sm" full kind={primary ? 'primary' : 'secondary'} onClick={() => dispatch({ type: 'walk/join', id: e.id })}>加入</Btn>
    </Card>
  );
}

function JoinedCard({ e }: { e: WalkEvent }) {
  const { state, dispatch, today } = useStore();
  const pet = findPet(state, state.walk.petId);
  const looks = [...e.dogs.map((d) => d.look), ...(pet ? [pet.look] : [])];
  return (
    <Card tone="sky" className="event">
      <div className="row event__top">
        <TimeBox when={e.when} />
        <div className="grow"><b>{e.place}</b><small className="muted">{e.mine ? '我发起的' : `${e.host}发起`} · {sizesText(e.sizes)} · {e.vibe}</small></div>
        <Tag tone="sky-strong">{e.status === 'open' ? '即将参加' : e.status === 'checkedIn' ? '遛完了' : '已评价'}</Tag>
      </div>
      <div className="row"><Dogs looks={looks} /><small className="muted grow">已有 {looks.length} 只（含{pet?.name}）· 上限 {e.capacity}</small></div>
      {e.status === 'open' && (
        <div className="row">
          <Btn size="sm" kind="secondary" className="grow" icon="check" onClick={() => dispatch({ type: 'walk/checkin', id: e.id, date: today })}>到场打卡</Btn>
          {!e.mine && <Btn size="sm" kind="text" onClick={() => dispatch({ type: 'walk/leave', id: e.id })}>退出</Btn>}
        </div>
      )}
      {e.status === 'checkedIn' && (
        <div className="row row--wrap"><small className="grow">这次玩得怎么样？</small>
          {RATE.map(([r, l]) => <Chip key={r} onClick={() => dispatch({ type: 'walk/rate', id: e.id, rating: r })}>{l}</Chip>)}</div>
      )}
      {e.status === 'rated' && <Tag tone={e.rating === 'bad' ? 'muted' : 'green'}>{e.rating === 'bad' ? '不再推荐这位发起人的局' : e.mine ? '谢谢组局' : `${e.host}已成为宠友`}</Tag>}
    </Card>
  );
}

function Find() {
  const { state, today } = useStore();
  const pet = findPet(state, state.walk.petId);
  const [filter, setFilter] = useState<Filter>('all');
  const vaccineOk = (['vaccine_core', 'vaccine_rabies'] as const).every((k) => {
    const p = state.plans.find((x) => x.petId === state.walk.petId && x.kind === k);
    const st = p ? shieldInfo(p, today, leadOf(state)).state : 'unknown';
    return st === 'safe' || st === 'soon';
  });
  const ranked = rankEvents(state.walk, vaccineOk, state.myGeohash, state.walkEvents, new Set(state.hiddenHosts));
  const list = ranked.filter((r) => filter === 'all' || (filter === 'tonight' ? r.e.when.startsWith('今晚') : filter === 'weekend' ? r.e.slot.startsWith('周末') : r.km <= 1));
  const joined = state.walkEvents.filter((e) => e.joined);
  return (
    <section className="stack">
      <div className="walk-hero"><img src={asset('walk_party')} alt="傍晚的公园里几只小狗一起玩" /><span>附近有 {ranked.length} 个适合{pet?.name}的局</span></div>
      {!vaccineOk && <div className="note note--amber">{pet?.name}的核心疫苗或狂犬疫苗还没确认，补全后才能参加遛狗局。</div>}
      {joined.length > 0 && <h2 className="h2">即将参加</h2>}
      {joined.map((e) => <JoinedCard key={e.id} e={e} />)}
      <div className="row row--wrap">{(Object.keys(FILTERS) as Filter[]).map((f) => <Chip key={f} small on={filter === f} onClick={() => setFilter(f)}>{FILTERS[f]}</Chip>)}</div>
      {list.map((r, i) => <EventCard key={r.e.id} r={r} primary={i === 0} />)}
      {!list.length && <Empty img="empty_nearby" title="附近暂时没有合适的局"><Btn size="sm" kind="secondary" to="/circle/walk?tab=host">自己组一个</Btn></Empty>}
      <p className="hint">地点只能选公共场所 · 首次参加建议白天 · 全程站内沟通，不交换手机号</p>
    </section>
  );
}

function Host({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useStore();
  const [when, setWhen] = useState(2);
  const [place, setPlace] = useState(0);
  const [size, setSize] = useState(2);
  const [vibe, setVibe] = useState(VIBES[0]);
  const [cap, setCap] = useState(6);
  const w = WHEN[when];
  const p = PLACES[place];
  const so = SIZE_OPTS[size];
  const fits = so.sizes.includes(state.walk.size);
  return (
    <section className="stack">
      <h3 className="h3">什么时候</h3>
      <div className="row row--wrap">{WHEN.map((x, i) => <Chip key={x.label} on={i === when} onClick={() => setWhen(i)}>{x.label}</Chip>)}</div>
      <h3 className="h3">在哪（只能选公共场所）</h3>
      {PLACES.map((x, i) => (
        <button key={x.name} type="button" aria-pressed={i === place} className={`pick-row${i === place ? ' pick-row--on' : ''}`} onClick={() => setPlace(i)}>
          <Icon name="pin" /><span className="grow"><b>{x.name}</b><br /><small className="muted">{x.sub}</small></span>{i === place && <Icon name="check" />}
        </button>
      ))}
      <h3 className="h3">适合哪些狗狗</h3>
      <div className="row row--wrap">{SIZE_OPTS.map((x, i) => <Chip key={x.label} on={i === size} onClick={() => setSize(i)}>{x.label}</Chip>)}</div>
      {!fits && <p className="hint danger">你家狗狗的体型不在这个范围里</p>}
      <h3 className="h3">局的氛围</h3>
      <div className="row row--wrap">{VIBES.map((v) => <Chip key={v} on={v === vibe} onClick={() => setVibe(v)}>{v}</Chip>)}</div>
      <h3 className="h3">最多几只</h3>
      <div className="row">
        <button type="button" className="icon-btn" aria-label="减少" onClick={() => setCap(Math.max(2, cap - 1))}>−</button>
        <b className="num cap" aria-live="polite">{cap}</b>
        <button type="button" className="icon-btn" aria-label="增加" onClick={() => setCap(Math.min(10, cap + 1))}>+</button>
        <small className="muted">只狗（含你家）</small>
      </div>
      <Card tone="orange">
        <div className="row"><img src={asset('entry_walk')} alt="" width={72} height={43} /><div className="grow"><b>{w.label} · {p.name}</b><br /><small>{so.label} · {vibe} · 最多 {cap} 只</small></div></div>
      </Card>
      <Btn full disabled={!fits} onClick={() => { dispatch({ type: 'walk/host', event: { when: w.label, slot: w.slot, place: p.name, sizes: so.sizes, vibe, capacity: cap } }); onDone(); }}>发起遛狗局</Btn>
      <p className="hint center">发起后 3 公里内合适的狗主人会看到</p>
    </section>
  );
}

/** 遛狗局（狗）：找局 / 组局 → 到场打卡 → 遛后评价 → 成为宠友；不做一对一 */
export default function WalkPage() {
  const { state } = useStore();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'host' ? 'host' : 'find';
  const pet = findPet(state, state.walk.petId);
  if (!pet || pet.species !== 'dog') {
    return <div className="page"><TopBar title="遛狗局" back="/circle" /><Empty img="empty_nearby" title="遛狗局目前只给狗狗用">猫咪不适合约玩，去云串门给别人家送小鱼干吧。<Btn to="/circle/visit">去云串门</Btn></Empty></div>;
  }
  return (
    <div className="page">
      <TopBar title="遛狗局" back="/circle" />
      <div className="ttabs" role="tablist" aria-label="遛狗局">
        {(['find', 'host'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`ttab${tab === t ? ' ttab--on' : ''}`} onClick={() => setSp(t === 'host' ? { tab: 'host' } : {}, { replace: true })}>
            {t === 'find' ? '找局' : '组局'}
          </button>
        ))}
      </div>
      {tab === 'find' ? <Find /> : <Host onDone={() => setSp({}, { replace: true })} />}
    </div>
  );
}

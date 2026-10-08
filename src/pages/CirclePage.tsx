import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { asset, petImage, RATIO } from '../components/assets';
import { Icon } from '../components/icons';
import { posterText, SightingSheet } from '../components/SightingSheet';
import { Avatar, Btn, Card, Chip, Empty, IconBtn, Sheet, Tag } from '../components/ui';
import { copyText } from '../components/util';
import { ageText } from '../domain/dates';
import { petWeights } from '../domain/summary';
import type { Layer, LostAlert, Post } from '../domain/types';
import { uid } from '../store/reducer';
import { petWeather } from '../store/selectors';
import { useStore } from '../store/StoreContext';

type Tab = 'rec' | 'near' | 'friends' | 'interest';
const TABS: Record<Tab, string> = { rec: '推荐', near: '附近', friends: '宠友', interest: '同好' };
const GROUPS = ['全部', '橘猫圈', '英短圈', '柯基圈', '柴犬圈', '新手幼猫圈'];
const ENTRIES = [{ key: 'entry_walk', label: '遛狗局', to: '/circle/walk' }, { key: 'entry_visit', label: '串门', to: '/circle/visit' },
  { key: 'entry_lost', label: '寻宠', to: '/circle/lost' }, { key: 'entry_foster', label: '托付', to: '/circle/foster' }];
const TINT: Record<string, string> = { juzi: 'amber', zhima: 'sky', doubao: 'green', kele: 'orange' };
const ASK_TO: Record<string, Layer> = { 同好: 'interest', 附近: 'nearby' };

function AskSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? '');
  const [text, setText] = useState('');
  const [to, setTo] = useState('同好');
  const [useCtx, setUseCtx] = useState(true);
  const pet = state.pets.find((p) => p.id === petId);
  const last = pet ? petWeights(state, pet.id).sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0] : undefined;
  const ctx = pet ? [pet.species === 'cat' ? '猫' : '狗', pet.birthday ? ageText(pet.birthday, today) : '', last ? `${last.kg} kg` : '', ...petWeather(state, pet.id, today).reasons.slice(0, 2)].filter(Boolean) : [];
  return (
    <Sheet open onClose={onClose} title="带档案提问">
      <div className="row row--wrap">{state.pets.map((p) => <Chip key={p.id} on={p.id === petId} onClick={() => setPetId(p.id)}>{p.name}</Chip>)}</div>
      <label className="field"><span className="label">想问什么</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="比如：换粮期间软便，大家怎么过渡的？" /></label>
      <div className="row row--wrap"><Chip on={useCtx} onClick={() => setUseCtx(!useCtx)}>附上宠物卡</Chip>{useCtx && ctx.map((t) => <Tag key={t}>{t}</Tag>)}</div>
      <span className="label">发到</span>
      <div className="row row--wrap">{Object.keys(ASK_TO).map((l) => <Chip key={l} on={to === l} onClick={() => setTo(l)}>{l}</Chip>)}</div>
      <Btn full disabled={!text.trim() || !pet} onClick={() => {
        if (!pet) return;
        dispatch({ type: 'post/add', post: { id: uid('post'), author: state.nickname, look: pet.look, layer: ASK_TO[to], circle: to === '同好' ? `${pet.breed}圈` : '附近', text: text.trim(), tags: useCtx ? ctx : [pet.name], ask: true, fish: 0, answers: 0, mine: true, ago: '刚刚' } });
        onClose();
      }}>发布</Btn>
    </Sheet>
  );
}

/** 寻宠卡片（走失互助页也在用） */
export function LostCard({ l, onSee }: { l: LostAlert; onSee: (l: LostAlert) => void }) {
  const { dispatch } = useStore();
  return (
    <Card tone="coral">
      <div className="row"><Icon name="alert" color="#C23136" /><b className="grow">{l.radiusKm} 公里内 · {l.petName}走失</b><small className="muted">{l.since}</small></div>
      <small>{l.desc} · 最后出现在{l.area}</small>
      {l.sightings.length > 0 && <small className="muted">已有 {l.sightings.length} 条线索</small>}
      <div className="row">
        <Btn size="sm" className="grow" icon="camera" onClick={() => onSee(l)}>我看到了</Btn>
        <Btn size="sm" kind="secondary" className="grow" icon="share" onClick={async () => dispatch({ type: 'toast', text: (await copyText(posterText(l))) ? '寻宠文案已复制，去业主群粘贴' : '复制失败' })}>转发到业主群</Btn>
      </div>
    </Card>
  );
}

function PostCard({ p }: { p: Post }) {
  const { dispatch, today } = useStore();
  const src = <span className="fcard__src"><Tag tone="white">{p.circle}</Tag></span>;
  return (
    <article className="fcard">
      {p.cover ? <div className="fcard__cover"><img src={asset(p.cover)} alt="" style={{ aspectRatio: String(RATIO[p.cover] ?? 0.75) }} />{src}</div>
        : p.image ? <div className="fcard__cover"><img src={p.image} alt="" />{src}</div>
          : !p.ask ? <div className={`fcard__pet fcard__pet--${TINT[p.look]}`}><img src={petImage(p.look, 'happy').src} alt="" />{src}</div> : null}
      <div className="fcard__body">
        {p.ask && <div className="row"><Tag tone="amber">带档案提问</Tag><small className="muted">{p.circle}</small></div>}
        <p className="fcard__title">{p.text}</p>
        {p.ask && <div className="row row--wrap">{p.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>}
        <div className="row fcard__meta">
          <Avatar look={p.look} size={22} />
          <small className="grow">{p.author}{p.ask ? ` · ${p.answers} 个回答` : ''}</small>
          {p.mine ? <small>收到 {p.fish}</small> : (
            <button type="button" className={`fish-btn${p.liked ? ' fish-btn--on' : ''}`} disabled={p.liked} aria-label={`${p.liked ? '已送小鱼干' : '送小鱼干'}，共 ${p.fish}`}
              onClick={() => dispatch({ type: 'post/like', postId: p.id, date: today })}>
              <img src={asset('icon_fish')} alt="" width={26} height={9} /><span className="num">{p.fish}</span>
            </button>
          )}
        </div>
        {p.mine && p.ask && p.answers > 0 && !p.adopted && <Btn size="sm" kind="text" onClick={() => dispatch({ type: 'post/adopt', postId: p.id })}>采纳</Btn>}
      </div>
    </article>
  );
}

/** 圈子：顶部 Tab（推荐 · 附近 · 宠友 · 同好），默认推荐；附近求助置顶；双列瀑布流 */
export default function CirclePage() {
  const { state } = useStore();
  const [sp, setSp] = useSearchParams();
  const tab: Tab = (sp.get('tab') as Tab) in TABS ? (sp.get('tab') as Tab) : 'rec';
  const [group, setGroup] = useState('全部');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [seeing, setSeeing] = useState<LostAlert | null>(null);
  const alerts = state.lost.filter((l) => !l.resolved && !l.mine);
  const set = (k: string, v?: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const posts = state.posts.filter((p) => (tab === 'rec' || (tab === 'near' ? p.layer === 'nearby' || p.layer === 'city' : tab === 'friends' ? p.layer === 'friends' : p.layer === 'interest'))
    && (tab !== 'interest' || group === '全部' || p.circle === group) && (!q || p.text.includes(q) || p.tags.some((t) => t.includes(q))));
  const cols = [posts.filter((_, i) => i % 2 === 0), posts.filter((_, i) => i % 2 === 1)];
  const alert = alerts[0];
  return (
    <div className="page">
      <header className="home-head">
        <h1 className="display grow">圈子</h1>
        <IconBtn icon="search" label="搜索" onClick={() => setSearching(!searching)} />
        <Btn size="sm" kind="secondary" icon="plus" onClick={() => set('compose', '1')}>提问</Btn>
      </header>
      {searching && <input className="search" autoFocus placeholder="搜索动态和标签" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜索动态" />}
      <div className="ttabs" role="tablist" aria-label="圈子分类">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`ttab${tab === t ? ' ttab--on' : ''}`} onClick={() => set('tab', t === 'rec' ? undefined : t)}>{TABS[t]}</button>
        ))}
      </div>
      <nav className="kk-row" aria-label="常用入口">
        {ENTRIES.map((e) => (
          <Link key={e.key} className="kk" to={e.to}>
            <span className="kk__pic"><img src={asset(e.key)} alt="" /></span>{e.label}
            {e.key === 'entry_lost' && alerts.length > 0 && <b className="badge" aria-label={`${alerts.length} 条附近求助`}>{alerts.length}</b>}
          </Link>
        ))}
      </nav>
      {(tab === 'rec' || tab === 'near') && alert && (
        <div className="urgent">
          <Icon name="alert" color="#C23136" />
          <div className="grow"><b>{alert.radiusKm} 公里内 · {alert.petName}走失</b><br /><small className="muted">{alert.since} · {alert.desc}</small></div>
          <Btn size="sm" icon="camera" onClick={() => setSeeing(alert)}>我看到了</Btn>
        </div>
      )}
      {tab === 'interest' && <div className="row row--wrap">{GROUPS.map((g) => <Chip key={g} small on={group === g} onClick={() => setGroup(g)}>{g}</Chip>)}</div>}
      {posts.length === 0 ? (
        <Empty img="empty_nearby" title={`${TABS[tab]}还没有动态`}><Btn size="sm" kind="secondary" onClick={() => set('tab')}>看看推荐</Btn></Empty>
      ) : (
        <div className="masonry">{cols.map((c, i) => <div key={i} className="masonry__col">{c.map((p) => <PostCard key={p.id} p={p} />)}</div>)}</div>
      )}
      {sp.get('compose') === '1' && <AskSheet onClose={() => set('compose')} />}
      <SightingSheet alert={seeing} onClose={() => setSeeing(null)} />
    </div>
  );
}

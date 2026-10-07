import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { asset } from '../components/assets';
import { Icon } from '../components/icons';
import { posterText, SightingSheet } from '../components/SightingSheet';
import { Avatar, Btn, Card, Chip, Empty, IconBtn, Segmented, Sheet, Tag } from '../components/ui';
import { copyText } from '../components/util';
import { ageText } from '../domain/dates';
import type { Layer, LostAlert } from '../domain/types';
import { uid } from '../store/reducer';
import { petWeather } from '../store/selectors';
import { useStore } from '../store/StoreContext';
import { petWeights } from '../domain/summary';

export const LAYER_NAME: Record<Layer, string> = { friends: '宠友', nearby: '附近', city: '同城', interest: '同好' };
const LAYER_SUB: Record<Layer, string> = { friends: 'L1', nearby: 'L2', city: 'L3', interest: 'L4' };

function AskSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? '');
  const [text, setText] = useState('');
  const [layer, setLayer] = useState<Layer>('interest');
  const pet = state.pets.find((p) => p.id === petId);
  const ctx = pet ? [pet.species === 'cat' ? '猫' : '狗', pet.birthday ? ageText(pet.birthday, today) : '', petWeights(state, pet.id).slice(-1)[0] ? `${petWeights(state, pet.id).sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0].kg} kg` : '',
    ...petWeather(state, pet.id, today).reasons.slice(0, 2)].filter(Boolean) : [];
  const [useCtx, setUseCtx] = useState(true);
  return (
    <Sheet open onClose={onClose} title="带档案提问">
      <div className="row row--wrap">{state.pets.map((p) => <Chip key={p.id} on={p.id === petId} onClick={() => setPetId(p.id)}>{p.name}</Chip>)}</div>
      <label className="field"><span className="label">想问什么</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="比如：换粮期间软便，大家怎么过渡的？" /></label>
      <div className="row row--wrap"><Chip on={useCtx} onClick={() => setUseCtx(!useCtx)}>附上宠物卡</Chip>{useCtx && ctx.map((t) => <Tag key={t}>{t}</Tag>)}</div>
      <span className="label">发到</span>
      <div className="row row--wrap">{(['interest', 'nearby', 'city'] as Layer[]).map((l) => <Chip key={l} on={layer === l} onClick={() => setLayer(l)}>{LAYER_NAME[l]}</Chip>)}</div>
      <Btn full disabled={!text.trim() || !pet} onClick={() => {
        if (!pet) return;
        dispatch({ type: 'post/add', post: { id: uid('post'), author: state.nickname, look: pet.look, layer, circle: layer === 'interest' ? `${pet.breed}圈` : LAYER_NAME[layer], text: text.trim(), tags: useCtx ? ctx : [pet.name], ask: true, fish: 0, answers: 0, mine: true, ago: '刚刚' } });
        onClose();
      }}>发布</Btn>
    </Sheet>
  );
}

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

export default function CirclePage() {
  const { state, dispatch, today } = useStore();
  const [sp, setSp] = useSearchParams();
  const layer: Layer = (sp.get('layer') as Layer) in LAYER_NAME ? (sp.get('layer') as Layer) : 'nearby';
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [seeing, setSeeing] = useState<LostAlert | null>(null);
  const alerts = state.lost.filter((l) => !l.resolved && !l.mine);
  const posts = state.posts.filter((p) => p.layer === layer && (!q || p.text.includes(q) || p.tags.some((t) => t.includes(q))));
  const set = (k: string, v?: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  return (
    <div className="page">
      <header className="home-head">
        <div className="grow"><h1 className="display">圈子</h1><small className="muted">附近 1 公里 · 只显示到街区</small></div>
        <IconBtn icon="search" label="搜索" onClick={() => setSearching(!searching)} />
      </header>
      {searching && <input className="search" autoFocus placeholder="搜索动态和标签" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜索动态" />}
      <Segmented options={Object.keys(LAYER_NAME) as Layer[]} value={layer} onChange={(v) => set('layer', v)} labels={LAYER_NAME} sub={LAYER_SUB} />
      <div className="grid2">
        <Link className="tile" to="/circle/walk"><Avatar look="kele" size={40} tone="orange" /><span><b>约遛</b><small>狗狗嗅一嗅匹配</small></span></Link>
        <Link className="tile" to="/circle/visit"><span className="tile__door"><img src={asset('obj_door')} alt="" /></span><span><b>云串门</b><small>去别人家送小鱼干</small></span></Link>
        <Link className="tile" to="/circle/lost"><span className="icircle icircle--coral"><Icon name="alert" /></span><span><b>走失互助</b><small>附近求助与线索</small></span>
          {alerts.length > 0 && <b className="badge badge--tile">{alerts.length}</b>}</Link>
        <Link className="tile" to="/circle/foster"><span className="icircle icircle--green"><Icon name="heart" /></span><span><b>临时托付</b><small>请宠友上门照顾</small></span></Link>
      </div>
      {layer === 'nearby' && alerts.slice(0, 1).map((l) => <LostCard key={l.id} l={l} onSee={setSeeing} />)}
      <div className="row"><h2 className="h2 grow">{LAYER_NAME[layer]}动态</h2><Btn size="sm" kind="secondary" icon="plus" onClick={() => set('compose', '1')}>带档案提问</Btn></div>
      {posts.length === 0 && <Empty img="empty_nearby" title={`${LAYER_NAME[layer]}还没有动态`}><Btn size="sm" kind="secondary" onClick={() => set('layer', 'interest')}>先去同好圈看看</Btn></Empty>}
      {posts.map((p) => (
        <Card key={p.id}>
          <div className="row"><Avatar look={p.look} size={40} /><div className="grow"><b>{p.author}</b><br /><small className="muted">{p.circle} · {p.ago}</small></div>{p.ask && <Tag tone="amber">带档案提问</Tag>}</div>
          <p className="post__text">{p.text}</p>
          {p.image && <img className="post__img" src={p.image} alt="" />}
          <div className="row row--wrap">{p.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
          <div className="row">
            <small className="muted grow">{p.answers ? `${p.answers} 个回答${p.adopted ? ' · 已采纳 1' : ''}` : p.mine ? '等待宠友回答' : '还没有回答'}</small>
            {p.mine ? <small className="muted">收到小鱼干 {p.fish}</small> : (
              <button type="button" className={`btn btn--secondary btn--sm${p.liked ? ' btn--done' : ''}`} disabled={p.liked} onClick={() => dispatch({ type: 'post/like', postId: p.id, date: today })}>
                <img src={asset('icon_fish')} alt="" width={22} height={10} /><span>{p.liked ? '已送' : '送小鱼干'} {p.fish}</span>
              </button>)}
            {p.ask && p.answers > 0 && !p.adopted && p.mine && <Btn size="sm" kind="text" onClick={() => dispatch({ type: 'post/adopt', postId: p.id })}>采纳</Btn>}
          </div>
        </Card>
      ))}
      {sp.get('compose') === '1' && <AskSheet onClose={() => set('compose')} />}
      <SightingSheet alert={seeing} onClose={() => setSeeing(null)} />
    </div>
  );
}

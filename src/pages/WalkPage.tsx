import { useState } from 'react';
import { petImage } from '../components/assets';
import { Icon } from '../components/icons';
import { Avatar, Btn, Card, Chip, Empty, Sheet, Tag, TopBar } from '../components/ui';
import { distanceLabel } from '../domain/geo';
import { rankCandidates } from '../domain/match';
import { shieldInfo } from '../domain/shield';
import type { Candidate, Size, WalkProfile } from '../domain/types';
import { findPet, leadOf } from '../store/selectors';
import { useStore } from '../store/StoreContext';

const TEMPERS = ['社牛', '精力旺盛', '爱追逐', '好奇', '黏人', '慢热', '温柔', '怕生'];
const SLOTS = ['工作日早上', '工作日晚上', '周末上午', '周末下午'];
const SLOT_TIME: Record<string, string> = { 工作日早上: '周三 7:30', 工作日晚上: '周三 19:30', 周末上午: '周六 9:00', 周末下午: '周日 16:00' };
const PLACES = ['滨河公园东门草坪', '城西公园宠物区', '望江街区口袋公园'];
const SIZE: Record<Size, string> = { S: '小', M: '中', L: '大' };

function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [p, setP] = useState<WalkProfile>(state.walk);
  const tog = (k: 'temper' | 'slots' | 'places', v: string) => setP({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] });
  return (
    <Sheet open onClose={onClose} title="我的遛遛卡">
      <span className="label">体型</span><div className="row">{(['S', 'M', 'L'] as Size[]).map((s) => <Chip key={s} on={p.size === s} onClick={() => setP({ ...p, size: s })}>{SIZE[s]}</Chip>)}</div>
      <span className="label">性格</span><div className="row row--wrap">{TEMPERS.map((t) => <Chip key={t} on={p.temper.includes(t)} onClick={() => tog('temper', t)}>{t}</Chip>)}</div>
      <span className="label">常遛时段</span><div className="row row--wrap">{SLOTS.map((t) => <Chip key={t} on={p.slots.includes(t)} onClick={() => tog('slots', t)}>{t}</Chip>)}</div>
      <span className="label">常去的公共地点</span><div className="row row--wrap">{PLACES.map((t) => <Chip key={t} on={p.places.includes(t)} onClick={() => tog('places', t)}>{t}</Chip>)}</div>
      <div className="row row--wrap"><Chip on={p.scaredOfBig} onClick={() => setP({ ...p, scaredOfBig: !p.scaredOfBig })}>怕大狗</Chip><Chip on={p.inHeat} onClick={() => setP({ ...p, inHeat: !p.inHeat })}>发情期（暂停约遛）</Chip></div>
      <Btn full disabled={!p.slots.length} onClick={() => { dispatch({ type: 'walk/profile', profile: p }); onClose(); }}>保存</Btn>
    </Sheet>
  );
}

function MatchSheet({ c, overlap, onClose }: { c: Candidate; overlap: string[]; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const slots = (overlap.length ? overlap : state.walk.slots).map((s) => SLOT_TIME[s] ?? s);
  const [slot, setSlot] = useState(slots[0]);
  const [place, setPlace] = useState(state.walk.places[0] ?? PLACES[0]);
  return (
    <Sheet open onClose={onClose} title={`和${c.name}匹配成功`}>
      <p className="muted">主人信息已解锁：{c.owner}。地点只能选公共场所，首次见面建议白天。</p>
      <span className="label">时间</span><div className="row row--wrap">{slots.map((s) => <Chip key={s} on={slot === s} onClick={() => setSlot(s)}>{s}</Chip>)}</div>
      <span className="label">地点</span><div className="row row--wrap">{PLACES.map((p) => <Chip key={p} on={place === p} onClick={() => setPlace(p)}>{p}</Chip>)}</div>
      <Btn full onClick={() => { dispatch({ type: 'walk/schedule', candidateId: c.id, slot, place }); onClose(); }}>发出邀约</Btn>
    </Sheet>
  );
}

/** 约遛匹配（狗）：先看狗狗合不合，双向嗅一嗅后才显示主人；见面打卡 → 评价 → 成为宠友 */
export default function WalkPage() {
  const { state, dispatch, today } = useStore();
  const pet = findPet(state, state.walk.petId);
  const [editing, setEditing] = useState(false);
  const [matching, setMatching] = useState<{ c: Candidate; overlap: string[] } | null>(null);
  if (!pet || pet.species !== 'dog') {
    return <div className="page"><TopBar title="约遛" back="/circle" /><Empty img="empty_nearby" title="约遛目前只给狗狗用">猫咪不适合约玩，去云串门给别人家送小鱼干吧。<Btn to="/circle/visit">去云串门</Btn></Empty></div>;
  }
  const vaccineOk = ['vaccine_core', 'vaccine_rabies'].every((k) => {
    const p = state.plans.find((x) => x.petId === pet.id && x.kind === k);
    return p && shieldInfo(p, today, leadOf(state)).state !== 'unknown' && shieldInfo(p, today, leadOf(state)).state !== 'over';
  });
  const scheduled = new Set(state.appointments.map((a) => a.candidateId));
  const exclude = new Set([...state.skipped, ...state.blocked, ...state.friends, ...scheduled, ...state.sniffed.filter((id) => !state.candidates.find((c) => c.id === id)?.likesYou)]);
  const ranked = rankCandidates(state.walk, vaccineOk, state.myGeohash, state.candidates, exclude);
  const top = ranked[0];
  const pendingMatch = ranked.find((r) => state.sniffed.includes(r.c.id) && r.c.likesYou);

  return (
    <div className="page">
      <TopBar title="约遛" back="/circle" right={<button type="button" className="icon-btn" aria-label="编辑遛遛卡" onClick={() => setEditing(true)}><Icon name="filter" /></button>} />
      <p className="muted">先看狗狗合不合，双方都「嗅一嗅」后才会显示主人。</p>
      {!vaccineOk && <div className="note note--amber">{pet.name}的核心疫苗或狂犬疫苗还没确认，补全后才能约遛。</div>}
      {top ? (
        <div className="match-card">
          <Tag tone="sky-strong">匹配度 {top.score}%</Tag>
          <img src={petImage(top.c.look, 'happy').src} alt={`${top.c.breed}${top.c.name}`} className="match-card__img" />
          <h2 className="display">{top.c.name}</h2>
          <small>{top.c.breed} · {top.c.age} · {top.c.sex} · {top.c.neutered ? '已绝育' : '未绝育'}</small>
          <div className="row row--wrap center-row">
            <Tag tone="green" icon="shield">{top.c.vaccine === 'proof' ? '疫苗齐全 · 凭证' : '疫苗齐全 · 主人自述'}</Tag>
            <Tag>体型 {SIZE[top.c.size]}</Tag><Tag icon="pin">{distanceLabel(top.km)}</Tag>
          </div>
          <div className="row row--wrap center-row">{top.c.temper.map((t) => <Tag key={t} tone="orange">{t}</Tag>)}</div>
          <div className="row"><Icon name="clock" size={18} /><small>{top.overlap.length ? `${top.overlap.join('、')}和${pet.name}重合` : '常遛时段不重合'}</small></div>
          {pendingMatch?.c.id === top.c.id ? <Btn full onClick={() => setMatching({ c: top.c, overlap: top.overlap })}>已匹配，去约时间</Btn> : (
            <div className="row match-card__acts">
              <button type="button" className="round-btn" aria-label="跳过" onClick={() => dispatch({ type: 'walk/skip', id: top.c.id })}><Icon name="x" size={30} /></button>
              <button type="button" className="round-btn round-btn--primary" aria-label="嗅一嗅" onClick={() => {
                dispatch({ type: 'walk/sniff', id: top.c.id });
                if (top.c.likesYou) setMatching({ c: top.c, overlap: top.overlap });
              }}><Icon name="paw" size={34} /></button>
            </div>
          )}
        </div>
      ) : (
        <Empty img="empty_nearby" title="附近暂时没有合适的狗狗"><Btn size="sm" kind="secondary" onClick={() => setEditing(true)}>调整遛遛卡</Btn></Empty>
      )}
      <Card>
        <div className="row"><Avatar look={pet.look} size={44} tone="orange" /><div className="grow"><b>我的遛遛卡 · {pet.name}</b><br />
          <small className="muted">体型 {SIZE[state.walk.size]} · {state.walk.temper.join('、')} · {state.walk.slots.join('、')}</small></div>
          <Btn size="sm" kind="text" onClick={() => setEditing(true)}>编辑</Btn></div>
      </Card>
      {state.appointments.map((ap) => {
        const c = state.candidates.find((x) => x.id === ap.candidateId);
        if (!c) return null;
        return (
          <Card key={ap.id} tone="sky">
            <div className="row"><Icon name="calendar" /><b className="grow">{ap.slot} · {ap.place}</b></div>
            <small>和{c.name}（{c.owner}）{ap.status === 'scheduled' ? ' · 可把行程分享给家人' : ''}</small>
            {ap.status === 'scheduled' && <Btn kind="secondary" full icon="check" onClick={() => dispatch({ type: 'walk/met', apptId: ap.id, date: today })}>见面打卡</Btn>}
            {ap.status === 'met' && (
              <div className="row row--wrap">
                <small className="grow">这次玩得怎么样？</small>
                {([['great', '超合拍'], ['ok', '还不错'], ['bad', '不太合适']] as const).map(([r, l]) => <Chip key={r} onClick={() => dispatch({ type: 'walk/rate', apptId: ap.id, rating: r })}>{l}</Chip>)}
              </div>
            )}
            {ap.status === 'rated' && <Tag tone={ap.rating === 'bad' ? 'muted' : 'green'}>{ap.rating === 'bad' ? '已不再推荐' : '已成为宠友'}</Tag>}
          </Card>
        );
      })}
      {editing && <ProfileSheet onClose={() => setEditing(false)} />}
      {matching && <MatchSheet c={matching.c} overlap={matching.overlap} onClose={() => setMatching(null)} />}
    </div>
  );
}

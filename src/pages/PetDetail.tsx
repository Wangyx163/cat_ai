import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { asset, petImage } from '../components/assets';
import { Icon } from '../components/icons';
import { ShareComposer } from '../components/ShareComposer';
import { Avatar, Btn, Card, Chip, Empty, Segmented, Sheet, TopBar, WeatherBadge } from '../components/ui';
import { fileToDataUrl } from '../components/util';
import { ageText, diffDays, fmtMD, monthKey, monthLabel } from '../domain/dates';
import { daysHome, lastMonthKey, milestones, statsBetween } from '../domain/milestones';
import { SHIELD_KINDS, shieldInfo } from '../domain/shield';
import { petWeights } from '../domain/summary';
import type { EventType, Pet, PetEvent, Size, Visibility } from '../domain/types';
import { WEATHER_NAME } from '../domain/weather';
import { weightTrend } from '../domain/weight';
import { findPet, leadOf, memberName, petWeather } from '../store/selectors';
import { useStore } from '../store/StoreContext';

type TabKey = 'grow' | 'profile';
const TABS: Record<TabKey, string> = { grow: '成长', profile: '档案' };
type Filter = 'all' | 'daily' | 'health' | 'milestone';
const FILTERS: Record<Filter, string> = { all: '全部', daily: '日常', health: '健康', milestone: '里程碑' };
const HEALTH: EventType[] = ['care', 'weight', 'visit', 'check', 'daily'];
const EV_ICON: Record<EventType, string> = { daily: 'sun', care: 'shield', weight: 'scale', moment: 'image', visit: 'heart', walk: 'paw', help: 'users', check: 'heart' };
/** 可见范围三档：仅家人（默认）/ 宠友 / 公开；健康记录固定只给家人 */
const VIS: Partial<Record<Visibility, string>> = { family: '仅家人', friends: '宠友', public: '公开' };
const VIS_KEYS: Visibility[] = ['family', 'friends', 'public'];

function Compose({ pet, onClose }: { pet: Pet; onClose: () => void }) {
  const { dispatch, today } = useStore();
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [vis, setVis] = useState<Visibility>('family');
  return (
    <Sheet open onClose={onClose} title={`记录${pet.name}的日常`}>
      <label className="field"><span className="label">一句话</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="今天发生了什么？" /></label>
      <label className="field"><span className="label">照片（可选）</span>
        <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImage(await fileToDataUrl(f)); }} /></label>
      {image && <img className="compose-img" src={image} alt="预览" />}
      <span className="label">谁能看到</span>
      <div className="row row--wrap">{VIS_KEYS.map((v) => <Chip key={v} on={vis === v} onClick={() => setVis(v)}>{VIS[v]}</Chip>)}</div>
      <small className="muted">{vis === 'public' ? '会出现在圈子的推荐和同好里，位置只显示到街区' : vis === 'friends' ? '一起遛过或互相串门的宠友能看到' : '只有一起养它的家人能看到'}</small>
      <Btn full disabled={!text.trim()} onClick={() => { dispatch({ type: 'moment/add', petId: pet.id, date: today, text, image, visibility: vis }); onClose(); }}>记进时间线</Btn>
    </Sheet>
  );
}

function Profile({ pet }: { pet: Pet }) {
  const { dispatch, today } = useStore();
  const up = (patch: Partial<Pet>) => dispatch({ type: 'pet/update', id: pet.id, patch });
  const missing = [!pet.birthday && '生日', pet.neutered === undefined && '绝育', !pet.lifestyle && '生活方式', !pet.sex && '性别'].filter(Boolean);
  return (
    <section className="stack">
      {missing.length > 0 ? <div className="note note--amber">还差 {missing.join('、')}，补齐后计划和摘要会更准</div> : <div className="note note--green">档案已补齐</div>}
      <Card line>
        <label className="field"><span className="label">生日</span><input type="date" max={today} value={pet.birthday ?? ''} onChange={(e) => up({ birthday: e.target.value || undefined })} /></label>
        <span className="label">性别</span>
        <div className="row"><Chip on={pet.sex === 'm'} onClick={() => up({ sex: 'm' })}>公</Chip><Chip on={pet.sex === 'f'} onClick={() => up({ sex: 'f' })}>母</Chip></div>
        <span className="label">是否绝育</span>
        <div className="row"><Chip on={pet.neutered === true} onClick={() => up({ neutered: true })}>已绝育</Chip><Chip on={pet.neutered === false} onClick={() => up({ neutered: false })}>未绝育</Chip></div>
        <span className="label">生活方式</span>
        <div className="row row--wrap">
          {([['indoor', '只在室内'], ['outdoor', '会出门'], ['multi', '多宠同住']] as const).map(([k, l]) => <Chip key={k} on={pet.lifestyle === k} onClick={() => up({ lifestyle: k })}>{l}</Chip>)}
        </div>
        {pet.species === 'dog' && (<><span className="label">体型</span>
          <div className="row">{(['S', 'M', 'L'] as Size[]).map((s) => <Chip key={s} on={pet.size === s} onClick={() => up({ size: s })}>{{ S: '小', M: '中', L: '大' }[s]}</Chip>)}</div></>)}
      </Card>
      <Card line>
        <span className="label">兽医建议体重区间（kg，可选）</span>
        <div className="row">
          <input aria-label="区间下限" type="number" step="0.1" value={pet.weightRange?.[0] ?? ''} onChange={(e) => up({ weightRange: e.target.value ? [Number(e.target.value), pet.weightRange?.[1] ?? Number(e.target.value)] : undefined })} />
          <span>到</span>
          <input aria-label="区间上限" type="number" step="0.1" value={pet.weightRange?.[1] ?? ''} onChange={(e) => up({ weightRange: e.target.value ? [pet.weightRange?.[0] ?? Number(e.target.value), Number(e.target.value)] : undefined })} />
        </div>
        <label className="field"><span className="label">过敏</span><input value={pet.allergies ?? ''} onChange={(e) => up({ allergies: e.target.value || undefined })} placeholder="没有就留空" /></label>
        <label className="field"><span className="label">芯片号（分享时自动隐藏）</span><input value={pet.chip ?? ''} onChange={(e) => up({ chip: e.target.value || undefined })} /></label>
        <label className="field"><span className="label">常去医院</span><input value={pet.hospital ?? ''} onChange={(e) => up({ hospital: e.target.value || undefined })} /></label>
      </Card>
    </section>
  );
}

/** 宠物详情：只放这只宠物的故事（成长）和档案；健康数据的「家」在养护，这里只放一张摘要卡 */
export default function PetDetail() {
  const { petId = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { state, today } = useStore();
  const pet = findPet(state, petId);
  const [filter, setFilter] = useState<Filter>('all');
  const [share, setShare] = useState<{ title: string; month: string } | null>(null);
  if (!pet) return <div className="page"><TopBar title="宠物详情" back="/" /><Empty img="empty_timeline" title="没找到这只宠物" /></div>;
  const tab: TabKey = sp.get('tab') === 'profile' ? 'profile' : 'grow';
  const w = petWeather(state, pet.id, today);
  const shields = state.plans.filter((p) => p.petId === pet.id && SHIELD_KINDS.includes(p.kind)).map((p) => shieldInfo(p, today, leadOf(state)).state);
  const safe = shields.filter((x) => x === 'safe').length;
  const todo = SHIELD_KINDS.length - safe;
  const tw = weightTrend(petWeights(state, pet.id), today);
  const ms = milestones(pet, today);
  const recentMs = ms.find((m) => diffDays(today, m.date) <= 30);
  const lm = lastMonthKey(today);
  const lmStats = statsBetween(state, pet.id, `${lm}-01`, `${lm}-31`);
  const events = state.events.filter((e) => e.petId === pet.id && (filter === 'all' || (filter === 'daily' ? e.type === 'moment' || e.type === 'walk' : filter === 'health' ? HEALTH.includes(e.type) : false)));
  const groups = events.reduce<Record<string, PetEvent[]>>((g, e) => { (g[monthKey(e.date)] ??= []).push(e); return g; }, {});

  return (
    <div className="page">
      <TopBar title="宠物详情" />
      <div className="row pet-head">
        <Avatar look={pet.look} size={72} tone="amber" alt={pet.name} />
        <div className="grow"><h1 className="display">{pet.name}</h1><small className="muted">{pet.breed} · {pet.birthday ? ageText(pet.birthday, today) : '年龄未填'} · 到家 {daysHome(pet, today)} 天</small></div>
      </div>
      <Link className="status-card" to={`/care?pet=${pet.id}`}>
        <WeatherBadge w={w.level} size={34} />
        <span className="grow"><b>今天 {WEATHER_NAME[w.level]} · 护盾{todo ? ` ${todo} 项要处理` : ` ${safe} 项安全`}</b><br />
          <small className="muted">{tw.last !== undefined ? `体重 ${tw.last} kg · ` : ''}健康数据都在「养护」</small></span>
        <Icon name="chev" size={20} />
      </Link>
      <Segmented options={Object.keys(TABS) as TabKey[]} value={tab} onChange={(t) => setSp(t === 'grow' ? {} : { tab: t }, { replace: true })} labels={TABS} />

      {tab === 'grow' && (
        <section className="stack">
          <div className="row"><h2 className="h2 grow">{monthLabel(monthKey(today))}</h2><Btn size="sm" kind="secondary" icon="plus" onClick={() => setSp({ compose: '1' }, { replace: true })}>记日常</Btn></div>
          <div className="row row--wrap">{(Object.keys(FILTERS) as Filter[]).map((f) => <Chip key={f} small on={filter === f} onClick={() => setFilter(f)}>{FILTERS[f]}</Chip>)}</div>
          {(filter === 'all' || filter === 'milestone') && recentMs && (
            <Card tone="orange" className="milestone">
              <div className="row">
                <img src={petImage(pet.look, 'happy').src} alt="" className="milestone__img" />
                <div className="grow stack-sm">
                  <div className="display h2">{recentMs.title}啦</div>
                  <small>{fmtMD(recentMs.date)} · 时间线和分享卡片已为你准备好</small>
                  <div><Btn size="sm" onClick={() => setShare({ title: recentMs.title, month: lm })}>生成分享卡片</Btn></div>
                </div>
              </div>
            </Card>
          )}
          {filter === 'milestone' && ms.map((m) => <div key={m.key} className="list-row"><Icon name="medal" /><b className="grow">{m.title}</b><small className="muted">{fmtMD(m.date)}</small></div>)}
          {(filter === 'all' || filter === 'health') && (
            <Card className="report">
              <div className="row">
                <img src={asset('card_monthly')} alt="" width={54} height={72} />
                <div className="grow"><b>{monthLabel(lm)}成长报告</b><br /><small className="muted">每日一问 {lmStats.dailyCount} 次 · 照护 {lmStats.careCount} 次</small></div>
                <Btn size="sm" kind="secondary" onClick={() => setShare({ title: '月度报告', month: lm })}>分享</Btn>
              </div>
            </Card>
          )}
          {filter !== 'milestone' && Object.entries(groups).map(([mk, list]) => (
            <div key={mk} className="rail">
              <small className="muted rail__month">{monthLabel(mk)}</small>
              {list.slice(0, 30).map((e) => (
                <div key={e.id} className={`rail__node rail__node--${e.type}`}>
                  <span className="rail__dot" />
                  <div className={`rail__card${e.type === 'moment' ? ' rail__card--big' : ''}`}>
                    {e.image && <img className="rail__img" src={e.image} alt="" />}
                    <div className="row"><Icon name={EV_ICON[e.type]} size={18} /><span className="grow">{fmtMD(e.date)} {e.title}</span></div>
                    <small className="muted">{[e.detail, e.type === 'care' || e.type === 'weight' || e.type === 'daily' ? `${memberName(state, e.by)}记录` : '', e.type === 'moment' ? `${VIS[e.visibility] ?? '仅家人'}可见` : ''].filter(Boolean).join(' · ')}</small>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!events.length && filter !== 'milestone' && <Empty img="empty_timeline" title="这里还空着">点「记日常」写下第一条吧</Empty>}
        </section>
      )}

      {tab === 'profile' && <Profile pet={pet} />}

      {sp.get('compose') === '1' && <Compose pet={pet} onClose={() => setSp({}, { replace: true })} />}
      {share && <ShareComposer pet={pet} title={share.title} month={share.month} onClose={() => setShare(null)} />}
    </div>
  );
}

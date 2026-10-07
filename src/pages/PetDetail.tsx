import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { asset } from '../components/assets';
import { Icon } from '../components/icons';
import { ShareComposer } from '../components/ShareComposer';
import { Avatar, Btn, Card, Chip, Empty, Segmented, Sheet, Tag, TopBar, WeatherBadge } from '../components/ui';
import { fileToDataUrl } from '../components/util';
import { ageText, diffDays, fmtMD, monthKey, monthLabel } from '../domain/dates';
import { daysHome, lastMonthKey, milestones, statsBetween } from '../domain/milestones';
import { SHIELD_KINDS, SHIELD_TITLE, shieldInfo } from '../domain/shield';
import type { EventType, Pet, PetEvent, Size, Visibility } from '../domain/types';
import { WEATHER_NAME } from '../domain/weather';
import { findPet, leadOf, memberName, petWeather } from '../store/selectors';
import { useStore } from '../store/StoreContext';

type TabKey = 'status' | 'grow' | 'profile' | 'visit';
const TABS: Record<TabKey, string> = { status: '状态', grow: '成长', profile: '档案', visit: '就诊' };
type Filter = 'all' | 'daily' | 'health' | 'milestone';
const FILTERS: Record<Filter, string> = { all: '全部', daily: '日常', health: '健康', milestone: '里程碑' };
const HEALTH: EventType[] = ['care', 'weight', 'visit', 'check', 'daily'];
const EV_ICON: Record<EventType, string> = { daily: 'sun', care: 'shield', weight: 'scale', moment: 'image', visit: 'heart', walk: 'paw', help: 'users', check: 'heart' };
const VIS: Record<Visibility, string> = { private: '仅自己', family: '家庭', friends: '宠友', nearby: '附近', public: '同好' };

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
      <div className="row row--wrap">{(Object.keys(VIS) as Visibility[]).map((v) => <Chip key={v} on={vis === v} onClick={() => setVis(v)}>{VIS[v]}</Chip>)}</div>
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

export default function PetDetail() {
  const { petId = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { state, dispatch, today } = useStore();
  const nav = useNavigate();
  const pet = findPet(state, petId);
  const [filter, setFilter] = useState<Filter>('all');
  const [share, setShare] = useState<{ title: string; month: string } | null>(null);
  if (!pet) return <div className="page"><TopBar title="宠物详情" back="/" /><Empty img="empty_timeline" title="没找到这只宠物" /></div>;
  const tab = (sp.get('tab') as TabKey) in TABS ? (sp.get('tab') as TabKey) : 'status';
  const setTab = (t: TabKey) => setSp({ tab: t }, { replace: true });
  const w = petWeather(state, pet.id, today);
  const ms = milestones(pet, today);
  const recentMs = ms.find((m) => diffDays(today, m.date) <= 30);
  const lm = lastMonthKey(today);
  const lmStats = statsBetween(state, pet.id, `${lm}-01`, `${lm}-31`);
  const events = state.events.filter((e) => e.petId === pet.id && (filter === 'all' || (filter === 'daily' ? e.type === 'moment' || e.type === 'walk' : filter === 'health' ? HEALTH.includes(e.type) : false)));
  const groups = events.reduce<Record<string, PetEvent[]>>((g, e) => { (g[monthKey(e.date)] ??= []).push(e); return g; }, {});
  const recentVisit = state.events.some((e) => e.petId === pet.id && e.type === 'visit' && e.title.startsWith('看医生') && diffDays(today, e.date) <= 30);
  const myLost = state.lost.find((l) => l.petId === pet.id && !l.resolved);

  return (
    <div className="page">
      <TopBar title="宠物详情" />
      <div className="row pet-head">
        <Avatar look={pet.look} size={72} tone="amber" alt={pet.name} />
        <div className="grow"><h1 className="display">{pet.name}</h1><small className="muted">{pet.breed} · {pet.birthday ? ageText(pet.birthday, today) : '年龄未填'} · 到家 {daysHome(pet, today)} 天</small></div>
        <Tag tone={w.level === 'sun' ? 'sun' : w.level === 'alert' ? 'coral-solid' : 'sky'} icon={w.level}>今天 {WEATHER_NAME[w.level]}</Tag>
      </div>
      <Segmented options={Object.keys(TABS) as TabKey[]} value={tab} onChange={setTab} labels={TABS} />

      {tab === 'status' && (
        <section className="stack">
          <Card>
            <div className="row"><WeatherBadge w={w.level} size={40} /><div className="grow"><b>今日天气：{WEATHER_NAME[w.level]}（{w.score} 分）</b><br /><small className="muted">{w.reasons.length ? w.reasons.join('、') : '每日一问一切正常'}</small></div></div>
          </Card>
          <Card>
            <h2 className="h2">护盾</h2>
            {SHIELD_KINDS.map((k) => {
              const p = state.plans.find((x) => x.petId === pet.id && x.kind === k);
              const info = p ? shieldInfo(p, today, leadOf(state)) : { state: 'unknown' as const };
              const t = { safe: ['安全', 'green'], soon: ['快到期', 'amber'], over: ['逾期', 'coral-solid'], unknown: ['待确认', 'muted'] }[info.state];
              return <div key={k} className="list-row"><b className="grow">{SHIELD_TITLE[k]}</b><Tag tone={t[1]}>{t[0]}</Tag>{info.due && <small className="muted">{fmtMD(info.due)}</small>}</div>;
            })}
          </Card>
          <div className="row"><Btn kind="secondary" className="grow" to={`/care?pet=${pet.id}`}>去养护</Btn><Btn kind="secondary" className="grow" icon="heart" to={`/check/${pet.id}`}>状态检测</Btn></div>
        </section>
      )}

      {tab === 'grow' && (
        <section className="stack">
          <div className="row"><h2 className="h2 grow">{monthLabel(monthKey(today))}</h2><Btn size="sm" kind="secondary" icon="plus" onClick={() => setSp({ tab: 'grow', compose: '1' }, { replace: true })}>记日常</Btn></div>
          <div className="row row--wrap">{(Object.keys(FILTERS) as Filter[]).map((f) => <Chip key={f} small on={filter === f} onClick={() => setFilter(f)}>{FILTERS[f]}</Chip>)}</div>
          {(filter === 'all' || filter === 'milestone') && recentMs && (
            <Card tone="orange" className="milestone">
              <div className="row">
                <img src={asset(`pet_${pet.look === 'kele' ? 'kele' : pet.look}_happy`)} alt="" className="milestone__img" />
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
                    <small className="muted">{[e.detail, e.type === 'care' || e.type === 'weight' || e.type === 'daily' ? `${memberName(state, e.by)}记录` : '', e.type === 'moment' ? `${VIS[e.visibility]}可见` : ''].filter(Boolean).join(' · ')}</small>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!events.length && filter !== 'milestone' && <Empty img="empty_timeline" title="这里还空着">点「记日常」写下第一条吧</Empty>}
        </section>
      )}

      {tab === 'profile' && <Profile pet={pet} />}

      {tab === 'visit' && (
        <section className="stack">
          <Btn full icon="heart" to={`/check/${pet.id}`}>开始状态检测</Btn>
          <Card>
            <h2 className="h2">检测与就诊</h2>
            {state.checks.filter((c) => c.petId === pet.id).map((c) => <div key={c.id} className="list-row"><b className="grow">{fmtMD(c.date)} 状态检测</b><Tag>{c.level === 'emergency' ? '建议尽快就医' : c.level === 'appointment' ? '建议预约' : '先观察'}</Tag></div>)}
            {state.events.filter((e) => e.petId === pet.id && e.type === 'visit').map((e) => <div key={e.id} className="list-row"><b className="grow">{fmtMD(e.date)} {e.title}</b><small className="muted">{e.detail}</small></div>)}
            {!state.checks.some((c) => c.petId === pet.id) && !state.events.some((e) => e.petId === pet.id && e.type === 'visit') && <p className="muted">还没有记录</p>}
          </Card>
          {recentVisit && <Btn kind="secondary" full onClick={() => dispatch({ type: 'visit/recovered', petId: pet.id, date: today })}>标记已痊愈</Btn>}
          {myLost ? <Btn kind="secondary" full to="/circle/lost">查看走失求助进展</Btn>
            : <Btn kind="secondary" full icon="alert" onClick={() => { dispatch({ type: 'lost/create', petId: pet.id }); nav('/circle/lost'); }}>{pet.name}走丢了？发起走失求助</Btn>}
        </section>
      )}

      {sp.get('compose') === '1' && <Compose pet={pet} onClose={() => setSp({ tab: 'grow' }, { replace: true })} />}
      {share && <ShareComposer pet={pet} title={share.title} month={share.month} onClose={() => setShare(null)} />}
    </div>
  );
}

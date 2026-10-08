import { useState } from 'react';
import { Btn, Card, Chip, Empty, Tag, TopBar } from '../components/ui';
import { addDays, fmtMD } from '../domain/dates';
import { findPet } from '../store/selectors';
import { useStore } from '../store/StoreContext';

const SERVICES = ['喂食', '换水', '铲屎', '陪玩', '喂药', '遛狗'];
const STATUS = { open: ['等待宠友接单', 'amber'], accepted: ['托付中', 'sky'], done: ['已完成', 'green'] } as const;

/** 临时托付：仅宠友可见；交接清单从档案自动生成；每次上门打卡；结束互评 */
export default function FosterPage() {
  const { state, dispatch, today } = useStore();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? '');
  const [from, setFrom] = useState(addDays(today, 3));
  const [to, setTo] = useState(addDays(today, 5));
  const [services, setServices] = useState<string[]>(['喂食', '换水', '铲屎']);
  const helper = state.friends[0];
  return (
    <div className="page">
      <TopBar title="临时托付" back="/circle" />
      <p className="note">仅 L1 宠友和实名认证的附近用户可见；平台不做担保交易，有偿与否双方约定。</p>
      <Card line>
        <b>发起托付</b>
        <div className="row row--wrap">{state.pets.map((p) => <Chip key={p.id} on={p.id === petId} onClick={() => setPetId(p.id)}>{p.name}</Chip>)}</div>
        <div className="row">
          <label className="field grow"><span className="label">从</span><input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field grow"><span className="label">到</span><input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="row row--wrap">{SERVICES.map((s) => <Chip key={s} on={services.includes(s)} onClick={() => setServices(services.includes(s) ? services.filter((x) => x !== s) : [...services, s])}>{s}</Chip>)}</div>
        <Btn full disabled={!petId || !services.length || to < from} onClick={() => dispatch({ type: 'foster/create', foster: { petId, from, to, services } })}>发给宠友</Btn>
      </Card>
      {state.fosters.length === 0 && <Empty img="empty_nearby" title="还没有托付记录" />}
      {state.fosters.map((f) => {
        const pet = findPet(state, f.petId);
        const meds = state.plans.filter((p) => p.petId === f.petId && p.kind === 'med' && (!p.endDate || p.endDate >= today)).map((p) => p.title);
        return (
          <Card key={f.id}>
            <div className="row"><b className="grow">{pet?.name} · {fmtMD(f.from)}–{fmtMD(f.to)}</b><Tag tone={STATUS[f.status][1]}>{STATUS[f.status][0]}</Tag></div>
            <small className="muted">{f.services.join('、')}{f.helper ? ` · ${f.helper}` : ''}</small>
            {f.status !== 'open' && pet && (
              <dl className="kv">
                <div className="kv__row"><dt>注意事项</dt><dd>{[pet.allergies ? `过敏：${pet.allergies}` : '无过敏', pet.lifestyle === 'indoor' ? '只在室内，注意关好门窗' : ''].filter(Boolean).join(' · ')}</dd></div>
                <div className="kv__row"><dt>用药</dt><dd>{meds.length ? meds.join('、') : '无'}</dd></div>
                <div className="kv__row"><dt>紧急联系</dt><dd>{state.nickname}（站内私信）{pet.hospital ? ` · 常去 ${pet.hospital}` : ''}</dd></div>
              </dl>
            )}
            {f.checkins.map((c, i) => <div key={i} className="list-row"><small className="grow">{fmtMD(c.date)} {c.note}</small></div>)}
            {f.status === 'open' && <Btn size="sm" kind="secondary" disabled={!helper} onClick={() => helper && dispatch({ type: 'foster/accept', id: f.id, helper })}>{helper ? `模拟：${helper}接单` : '还没有宠友，先去约遛认识一下'}</Btn>}
            {f.status === 'accepted' && (
              <div className="row">
                <Btn size="sm" kind="secondary" className="grow" onClick={() => dispatch({ type: 'foster/checkin', id: f.id, date: today, note: `${f.helper}上门打卡：${f.services.join('、')}已完成，${pet?.name}状态不错` })}>模拟：上门打卡</Btn>
                {['满意', '一般'].map((r) => <Btn key={r} size="sm" kind={r === '满意' ? 'primary' : 'secondary'} onClick={() => dispatch({ type: 'foster/done', id: f.id, rating: r, date: today })}>结束 · {r}</Btn>)}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

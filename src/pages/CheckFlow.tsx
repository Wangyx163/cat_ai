import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { asset } from '../components/assets';
import { Icon } from '../components/icons';
import { QR } from '../components/QR';
import { SummaryCard } from '../components/SummaryCard';
import { Btn, Card, Chip, Empty, Progress, Tag, TopBar } from '../components/ui';
import { copyText, downloadUrl } from '../components/util';
import { fmtMD } from '../domain/dates';
import { buildSummary } from '../domain/summary';
import { BODY_PARTS, DURATIONS, LEVEL_TEXT, RED_FLAGS, SYMPTOMS, triage } from '../domain/triage';
import type { CheckSession, TriageLevel } from '../domain/types';
import { uid } from '../store/reducer';
import { findPet } from '../store/selectors';
import { useStore } from '../store/StoreContext';

const HOT: Record<'cat' | 'dog', Record<string, [number, number]>> = {
  cat: { 头面部: [14, 30], 皮肤毛发: [53, 44], 肚子: [58, 70], 四肢: [26, 88], 屁股尾巴: [84, 56] },
  dog: { 头面部: [13, 27], 皮肤毛发: [55, 42], 肚子: [58, 68], 四肢: [32, 88], 屁股尾巴: [87, 38] },
};
const LEVEL_TONE: Record<TriageLevel, string> = { emergency: 'coral', appointment: 'amber', observe: 'green' };
const DIAGNOSES = ['肠胃问题', '皮肤问题', '呼吸道', '泌尿问题', '外伤', '其他'];
export const SHARE_TTL = 24 * 3600 * 1000;
export const shareUrl = (s: CheckSession) => `${window.location.origin}${window.location.pathname}#/share/summary/${s.id}?exp=${s.createdAt + SHARE_TTL}`;

function Backfill({ petId, onDone }: { petId: string; onDone: () => void }) {
  const { dispatch, today } = useStore();
  const [diag, setDiag] = useState(DIAGNOSES[0]);
  const [meds, setMeds] = useState([{ name: '', perDay: 2, days: 5 }]);
  const [revisit, setRevisit] = useState('');
  const [cost, setCost] = useState('');
  const setMed = (i: number, patch: Partial<(typeof meds)[number]>) => setMeds(meds.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <Card line>
      <h3 className="h3">回填这次就诊</h3>
      <span className="label">诊断类别</span>
      <div className="row row--wrap">{DIAGNOSES.map((d) => <Chip key={d} on={diag === d} onClick={() => setDiag(d)}>{d}</Chip>)}</div>
      <span className="label">医嘱用药（会自动生成喂药提醒）</span>
      {meds.map((m, i) => (
        <div key={i} className="row row--wrap med-row">
          <input aria-label={`药名 ${i + 1}`} placeholder="药名，如：益生菌" value={m.name} onChange={(e) => setMed(i, { name: e.target.value })} />
          <label>每天<select aria-label={`每天次数 ${i + 1}`} value={m.perDay} onChange={(e) => setMed(i, { perDay: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select>次</label>
          <label>共<input aria-label={`天数 ${i + 1}`} type="number" min={1} max={60} value={m.days} onChange={(e) => setMed(i, { days: Number(e.target.value) || 1 })} />天</label>
        </div>
      ))}
      <Btn size="sm" kind="text" icon="plus" onClick={() => setMeds([...meds, { name: '', perDay: 1, days: 3 }])}>再加一种药</Btn>
      <label className="field"><span className="label">复诊日期（可选）</span><input type="date" min={today} value={revisit} onChange={(e) => setRevisit(e.target.value)} /></label>
      <label className="field"><span className="label">费用（可选）</span><input placeholder="如：320 元" value={cost} onChange={(e) => setCost(e.target.value)} /></label>
      <Btn full onClick={() => { dispatch({ type: 'visit/backfill', petId, date: today, diagnosis: diag, meds, revisit: revisit || undefined, cost: cost || undefined }); onDone(); }}>保存并生成提醒</Btn>
    </Card>
  );
}

/** 状态检测：先排除急症 → 点身体图 → 分级 + 一键就诊摘要 → 就诊回填 */
export default function CheckFlow() {
  const { petId = '' } = useParams();
  const { state, dispatch, today } = useStore();
  const nav = useNavigate();
  const pet = findPet(state, petId);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [flags, setFlags] = useState<string[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [session, setSession] = useState<CheckSession | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [backfill, setBackfill] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  if (!pet) return <div className="page page--cool"><TopBar title="状态检测" back="/" /><Empty img="empty_timeline" title="没找到这只宠物" /></div>;
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const finish = (level?: TriageLevel) => {
    const s: CheckSession = { id: uid('chk'), petId, date: today, createdAt: Date.now(), redFlags: flags, parts, symptoms, duration, level: level ?? triage({ redFlags: flags, symptoms, duration }) };
    dispatch({ type: 'check/save', session: s });
    setSession(s);
    setStep(3);
  };
  const summary = session ? buildSummary(state, petId, session, today) : null;
  const level = session?.level;

  return (
    <div className="page page--cool">
      <TopBar title={step === 3 ? `检测结果 · ${pet.name}` : `状态检测 · ${pet.name}`} back={step === 1 ? -1 : undefined}
        right={<small className="muted">{step} / 3</small>} />
      <Progress value={step * 33.4} />
      {step === 1 && (
        <section className="stack">
          <div><h2 className="h2">先排除紧急情况</h2><p className="muted">勾选任何一项，请先联系医院，不用往下填。</p></div>
          <div className="checklist">
            {RED_FLAGS.map((f) => (
              <label key={f} className="checklist__row">
                <input type="checkbox" checked={flags.includes(f)} onChange={() => toggle(flags, setFlags, f)} />
                <span>{f}</span>
              </label>
            ))}
          </div>
          {flags.length ? (
            <>
              <Btn kind="danger" full icon="alert" onClick={() => finish('emergency')}>有，马上联系医院</Btn>
              <Btn kind="text" full onClick={() => setFlags([])}>勾错了，清空</Btn>
            </>
          ) : (
            <Btn full onClick={() => setStep(2)}>都没有，继续</Btn>
          )}
          <p className="hint center">仅供参考，不能替代兽医诊断</p>
        </section>
      )}
      {step === 2 && (
        <section className="stack">
          <div><h2 className="h2">哪里不舒服？</h2><p className="muted">直接点身体上的部位，可以多选。</p></div>
          <Card line>
            <div className="bodymap">
              <img src={asset(pet.species === 'dog' ? 'body_dog' : 'body_cat')} alt={`${pet.species === 'dog' ? '狗' : '猫'}的侧面身体图`} />
              {BODY_PARTS.map((p) => {
                const [x, y] = HOT[pet.species][p];
                return (
                  <button key={p} type="button" className={`hotspot${parts.includes(p) ? ' hotspot--on' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}
                    aria-pressed={parts.includes(p)} onClick={() => toggle(parts, setParts, p)}>
                    {parts.includes(p) ? <Icon name="check" size={14} stroke={2.6} /> : <i />}<span>{p}</span>
                  </button>
                );
              })}
            </div>
            <div className="row"><small className="muted">也可以选：</small><Chip on={parts.includes('整体状态')} onClick={() => toggle(parts, setParts, '整体状态')}>整体状态</Chip></div>
          </Card>
          <Card line>
            <h3 className="h3">具体症状（可多选）</h3>
            <div className="row row--wrap">{SYMPTOMS.map((s) => <Chip key={s} on={symptoms.includes(s)} onClick={() => toggle(symptoms, setSymptoms, s)}>{s}</Chip>)}</div>
            <h3 className="h3">持续多久？</h3>
            <div className="row row--wrap">{DURATIONS.map((d) => <Chip key={d} on={duration === d} onClick={() => setDuration(d)}>{d}</Chip>)}</div>
          </Card>
          <div className="row">
            <Btn kind="secondary" className="grow" onClick={() => setStep(1)}>上一步</Btn>
            <Btn className="grow" disabled={!(parts.length || symptoms.length) || !duration} onClick={() => finish()}>下一步</Btn>
          </div>
        </section>
      )}
      {step === 3 && session && summary && level && (
        <section className="stack">
          <Card tone={LEVEL_TONE[level]}>
            <Tag tone={level === 'emergency' ? 'coral-solid' : level === 'appointment' ? 'amber' : 'green'} icon={level === 'emergency' ? 'alert' : 'calendar'}>{LEVEL_TEXT[level].title}</Tag>
            <p>{LEVEL_TEXT[level].body}</p>
            {level === 'observe' && <small className="muted">已安排：{fmtMD(session.date)} 的明天，每日一问会追问一句。</small>}
            <small className="muted">仅供参考，不能替代兽医诊断。</small>
          </Card>
          {level === 'emergency' && (
            <Card line>
              <h3 className="h3">去哪看</h3>
              {pet.hospital && <div className="list-row"><b className="grow">常去：{pet.hospital}</b></div>}
              <a className="btn btn--danger btn--md btn--full" href="https://uri.amap.com/search?keyword=24%E5%B0%8F%E6%97%B6%E5%AE%A0%E7%89%A9%E5%8C%BB%E9%99%A2" target="_blank" rel="noreferrer">
                <Icon name="pin" size={20} /><span>查找附近 24 小时宠物医院</span></a>
            </Card>
          )}
          <SummaryCard ref={cardRef} summary={summary} look={pet.look} date={fmtMD(today)} note="分享链接 24 小时后失效 · 仅供参考，不能替代兽医诊断" />
          {showQR && <div className="center"><QR text={shareUrl(session)} label="就诊摘要二维码" size={160} /></div>}
          <Btn full icon="link" onClick={async () => { const ok = await copyText(shareUrl(session)); dispatch({ type: 'toast', text: ok ? '链接已复制，24 小时后失效' : '复制失败，可以用二维码或存图片' }); }}>发给医生（复制链接）</Btn>
          <div className="row">
            <Btn kind="secondary" className="grow" icon="qr" onClick={() => setShowQR(!showQR)}>{showQR ? '收起二维码' : '二维码'}</Btn>
            <Btn kind="secondary" className="grow" icon="image" onClick={async () => {
              if (!cardRef.current) return;
              try { downloadUrl(`${pet.name}-就诊摘要.png`, await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: '#FFFFFF' })); } catch { dispatch({ type: 'toast', text: '保存失败，请截图' }); }
            }}>存图片</Btn>
            <Btn kind="secondary" className="grow" onClick={async () => { const ok = await copyText(summary.text); dispatch({ type: 'toast', text: ok ? '文字已复制' : '复制失败' }); }}>复制文字</Btn>
          </div>
          {!backfill ? <Btn kind="text" full onClick={() => setBackfill(true)}>看完医生了？回填诊断、用药与复诊</Btn>
            : <Backfill petId={petId} onDone={() => nav('/')} />}
        </section>
      )}
    </div>
  );
}

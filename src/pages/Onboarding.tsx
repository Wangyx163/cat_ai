import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LOOKS, petImage } from '../components/assets';
import { Btn, Chip, Progress } from '../components/ui';
import type { Look, Species } from '../domain/types';
import { uid } from '../store/reducer';
import { useStore } from '../store/StoreContext';

/** 3 步入住：物种 → 名字 → 形象；其余信息第一周通过宠物头顶的问号慢慢补 */
export default function Onboarding() {
  const { dispatch, today } = useStore();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [step, setStep] = useState(1);
  const [species, setSpecies] = useState<Species>('cat');
  const [name, setName] = useState('');
  const [look, setLook] = useState<Look>('juzi');
  const looks = (Object.keys(LOOKS) as Look[]).filter((l) => LOOKS[l].species === species);
  return (
    <div className="page onboarding">
      {sp.get('from') && <p className="note">来自「{sp.get('from')}的家」的邀请</p>}
      <Progress value={(step / 3) * 100} />
      <small className="muted">第 {step} / 3 步</small>
      {step === 1 && (
        <section className="stack">
          <h1 className="display">家里的毛孩子是？</h1>
          <div className="row">
            {(['cat', 'dog'] as Species[]).map((s) => (
              <button key={s} type="button" className={`pick-card${species === s ? ' pick-card--on' : ''}`} aria-pressed={species === s}
                onClick={() => { setSpecies(s); setLook(s === 'cat' ? 'juzi' : 'doubao'); }}>
                <img src={petImage(s === 'cat' ? 'juzi' : 'doubao', 'happy').src} alt="" /><b>{s === 'cat' ? '猫' : '狗'}</b>
              </button>
            ))}
          </div>
          <Btn full onClick={() => setStep(2)}>下一步</Btn>
        </section>
      )}
      {step === 2 && (
        <section className="stack">
          <h1 className="display">它叫什么名字？</h1>
          <label className="field"><span className="label">名字（唯一需要打字的地方）</span><input autoFocus maxLength={12} value={name} onChange={(e) => setName(e.target.value)} placeholder="比如：年糕" /></label>
          <div className="row"><Btn kind="secondary" className="grow" onClick={() => setStep(1)}>上一步</Btn><Btn className="grow" disabled={!name.trim()} onClick={() => setStep(3)}>下一步</Btn></div>
        </section>
      )}
      {step === 3 && (
        <section className="stack">
          <h1 className="display">选一个最像它的形象</h1>
          <div className="row">
            {looks.map((l) => (
              <button key={l} type="button" className={`pick-card${look === l ? ' pick-card--on' : ''}`} aria-pressed={look === l} onClick={() => setLook(l)}>
                <img src={petImage(l, 'calm').src} alt="" /><b>{LOOKS[l].label}</b>
              </button>
            ))}
          </div>
          <div className="row row--wrap">{looks.map((l) => <Chip key={l} small on={look === l} onClick={() => setLook(l)}>{LOOKS[l].breed}</Chip>)}</div>
          <div className="row"><Btn kind="secondary" className="grow" onClick={() => setStep(2)}>上一步</Btn>
            <Btn className="grow" onClick={() => {
              dispatch({ type: 'pet/add', pet: { id: uid('p'), name: name.trim(), species, breed: LOOKS[look].breed, look, adoptedAt: today } });
              nav('/');
            }}>入住「家」</Btn></div>
        </section>
      )}
    </div>
  );
}

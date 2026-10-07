import { useEffect, useState } from 'react';
import { heldWeight } from '../domain/weight';
import { findPet } from '../store/selectors';
import { useStore } from '../store/StoreContext';
import { Btn, Chip, Sheet } from './ui';

function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0;
  const bump = (d: number) => onChange((Math.max(0, Math.round((n + d) * 10) / 10)).toFixed(1));
  return (
    <label className="stepper">
      <span className="label">{label}</span>
      <span className="row">
        <button type="button" className="icon-btn" aria-label={`${label}减少 0.1`} onClick={() => bump(-0.1)}>−</button>
        <input inputMode="decimal" type="number" step="0.1" min="0" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <span>kg</span>
        <button type="button" className="icon-btn" aria-label={`${label}增加 0.1`} onClick={() => bump(0.1)}>+</button>
      </span>
    </label>
  );
}

/** 称重小游戏：直接称，或抱着一起称再减掉自己的体重 */
export function WeighSheet({ petId, open, onClose }: { petId: string; open: boolean; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const pet = findPet(state, petId);
  const [mode, setMode] = useState<'direct' | 'held'>('direct');
  const [kg, setKg] = useState('');
  const [withPet, setWithPet] = useState('');
  const [alone, setAlone] = useState('');
  useEffect(() => { if (open) { setKg(''); setWithPet(''); setAlone(''); } }, [open]);
  const value = mode === 'direct' ? (Number(kg) > 0 ? Math.round(Number(kg) * 10) / 10 : null) : heldWeight(Number(withPet), Number(alone));
  return (
    <Sheet open={open} onClose={onClose} title={`给${pet?.name ?? ''}称体重`}>
      <div className="row">
        <Chip on={mode === 'direct'} onClick={() => setMode('direct')}>直接称</Chip>
        <Chip on={mode === 'held'} onClick={() => setMode('held')}>抱着称</Chip>
      </div>
      {mode === 'direct' ? (
        <Stepper label="宠物体重" value={kg} onChange={setKg} />
      ) : (
        <>
          <p className="hint">先抱着{pet?.name}一起称，再自己称一次，自动相减。</p>
          <Stepper label="抱着一起称" value={withPet} onChange={setWithPet} />
          <Stepper label="只称自己" value={alone} onChange={setAlone} />
        </>
      )}
      <div className="note">{value !== null ? <>这次是 <b className="num">{value} kg</b></> : '输入后自动计算'}</div>
      <Btn full disabled={value === null} onClick={() => { if (value !== null) { dispatch({ type: 'weight/add', petId, kg: value, date: today, method: mode }); onClose(); } }}>记下这次体重</Btn>
    </Sheet>
  );
}

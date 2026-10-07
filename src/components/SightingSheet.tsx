import { useState } from 'react';
import type { LostAlert } from '../domain/types';
import { useStore } from '../store/StoreContext';
import { Btn, Sheet } from './ui';

export const posterText = (l: LostAlert) => `【寻宠】${l.petName}：${l.desc}。最后出现在${l.area}，${l.since}。看到请在毛球屋点「我看到了」，或私信失主，谢谢邻居们！`;

/** 「我看到了」：拍照 + 模糊位置 + 时间，站内发给失主，不暴露手机号 */
export function SightingSheet({ alert, onClose }: { alert: LostAlert | null; onClose: () => void }) {
  const { dispatch } = useStore();
  const [note, setNote] = useState('');
  if (!alert) return null;
  return (
    <Sheet open onClose={onClose} title={`看到${alert.petName}了？`}>
      <p className="muted">位置只会显示到街区，时间自动记录为现在。</p>
      <label className="field"><span className="label">在哪、什么情况</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="比如：3 号楼地库入口，躲在车底" /></label>
      <Btn full onClick={() => { dispatch({ type: 'lost/sighting', alertId: alert.id, note }); setNote(''); onClose(); }}>把线索发给失主</Btn>
    </Sheet>
  );
}

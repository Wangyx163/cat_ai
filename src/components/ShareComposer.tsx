import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { addDays, fmtFull, monthLabel, type ISODate } from '../domain/dates';
import { statsBetween } from '../domain/milestones';
import { petWeights } from '../domain/summary';
import type { Pet } from '../domain/types';
import { uid } from '../store/reducer';
import { useStore } from '../store/StoreContext';
import { asset, petImage } from './assets';
import { Icon } from './icons';
import { QR } from './QR';
import { Sparkline } from './Sparkline';
import { Btn, Chip, Sheet } from './ui';
import { copyText, downloadUrl } from './util';

export type CardKind = 'milestone' | 'monthly' | 'weight';
const KIND_NAME: Record<CardKind, string> = { milestone: '成长纪念', monthly: '月度报告', weight: '体重曲线' };

/** 分享卡片：套模板 → 自动隐藏芯片号与精确位置 → 带「来串门」二维码导出 */
export function ShareComposer({ pet, title, month, onClose }: { pet: Pet; title: string; month: string; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const [kind, setKind] = useState<CardKind>('milestone');
  const ref = useRef<HTMLDivElement>(null);
  const year = statsBetween(state, pet.id, addDays(today, -365), today);
  const mon = statsBetween(state, pet.id, `${month}-01`, `${month}-31` as ISODate);
  const invite = `${window.location.origin}${window.location.pathname}#/onboarding?from=${encodeURIComponent(state.nickname)}`;
  const heading = kind === 'milestone' ? `${pet.name}${title}` : kind === 'monthly' ? `${pet.name}的${monthLabel(month).slice(7)}` : `${pet.name}的体重曲线`;
  const stats: [string, string][] = kind === 'milestone'
    ? [[year.weightTo !== undefined ? `${year.weightTo} kg` : '--', '体重'], [`${year.dewormOnTime} 次`, '按时驱虫'], [`${year.sunnyDays} 天`, '晴天']]
    : kind === 'monthly' ? [[`${mon.dailyCount} 次`, '每日一问'], [`${mon.careCount} 次`, '照护'], [mon.weightTo !== undefined ? `${mon.weightTo} kg` : '--', '月末体重']]
      : [[year.weightFrom !== undefined ? `${year.weightFrom}` : '--', '一年前 kg'], [year.weightTo !== undefined ? `${year.weightTo}` : '--', '现在 kg'], [`${petWeights(state, pet.id).length} 次`, '称重']];
  const caption = `${heading}！#毛球屋 #养宠日常 #${pet.breed}`;
  return (
    <Sheet open onClose={onClose} title="分享卡片预览">
      <div className="row row--wrap">{(Object.keys(KIND_NAME) as CardKind[]).map((k) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{KIND_NAME[k]}</Chip>)}</div>
      <div className="share-card" ref={ref}>
        <img className="share-card__bg" src={asset(kind === 'monthly' ? 'card_monthly' : 'card_milestone')} alt="" />
        <div className="share-card__body">
          <div className="row share-card__top"><small>毛球屋 · {KIND_NAME[kind]}</small><small className="grow right">{fmtFull(today)}</small></div>
          {kind === 'weight' ? <div className="share-card__chart"><Sparkline points={petWeights(state, pet.id)} range={pet.weightRange} width={200} height={90} /></div>
            : <img className="share-card__pet" src={petImage(pet.look, 'happy').src} alt={pet.name} />}
          <div className="display share-card__title">{heading}</div>
          <div className="row share-card__stats">{stats.map(([v, k]) => <div key={k} className="grow center"><b className="num">{v}</b><small>{k}</small></div>)}</div>
          <div className="row share-card__qr"><QR text={invite} size={44} label="邀请二维码" /><small>扫码来「{state.nickname}的家」串门</small></div>
        </div>
      </div>
      <div className="grid4">
        <button type="button" className="tile-btn" onClick={async () => {
          if (!ref.current) return;
          try { downloadUrl(`${pet.name}-${KIND_NAME[kind]}.png`, await toPng(ref.current, { pixelRatio: 3.75 })); dispatch({ type: 'toast', text: '已保存 3:4 图片，适合小红书' }); } catch { dispatch({ type: 'toast', text: '保存失败，请截图' }); }
        }}><Icon name="download" /><span>存相册</span></button>
        <button type="button" className="tile-btn" onClick={async () => dispatch({ type: 'toast', text: (await copyText(caption)) ? '文案已复制，去小红书粘贴' : '复制失败' })}><Icon name="share" /><span>小红书</span></button>
        <button type="button" className="tile-btn" onClick={async () => dispatch({ type: 'toast', text: (await copyText(caption)) ? '文案已复制，去朋友圈粘贴' : '复制失败' })}><Icon name="share" /><span>朋友圈</span></button>
        <button type="button" className="tile-btn" onClick={() => { dispatch({ type: 'post/add', post: { id: uid('post'), author: state.nickname, look: pet.look, layer: 'interest', circle: '同好', text: heading, tags: [pet.name, KIND_NAME[kind]], fish: 0, answers: 0, mine: true, ago: '刚刚' } }); onClose(); }}><Icon name="users" /><span>发圈子</span></button>
      </div>
      <p className="hint row"><Icon name="check" size={18} />已自动隐藏芯片号与精确位置</p>
      <Btn kind="text" full onClick={onClose}>完成</Btn>
    </Sheet>
  );
}

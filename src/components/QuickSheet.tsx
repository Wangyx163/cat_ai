import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { Icon } from './icons';
import { Avatar, Chip, Sheet } from './ui';

/** ＋ 快捷面板：先选宠物，再选要做的事 */
export function QuickSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const nav = useNavigate();
  const [petId, setPetId] = useState(state.pets[0]?.id ?? '');
  const go = (to: string) => { onClose(); nav(to); };
  const actions = [
    { icon: 'scale', label: '称体重', sub: '直接称或抱着称', to: `/care?pet=${petId}&weigh=1` },
    { icon: 'shield', label: '驱虫 / 疫苗打卡', sub: '选实际日期，自动算下次', to: `/care?pet=${petId}` },
    { icon: 'heart', label: '状态检测', sub: '先排除急症，再点身体图', to: `/check/${petId}` },
    { icon: 'image', label: '记日常', sub: '照片 + 一句话，进时间线', to: `/pet/${petId}?tab=grow&compose=1` },
    { icon: 'users', label: '发到圈子', sub: '带上宠物档案提问', to: '/circle?compose=1' },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="快速记录">
      <div className="row row--wrap">
        {state.pets.map((p) => (
          <Chip key={p.id} on={p.id === petId} onClick={() => setPetId(p.id)}>{p.name}</Chip>
        ))}
      </div>
      <div className="quick-list">
        {actions.map((a) => (
          <button key={a.label} type="button" className="quick-item" onClick={() => go(a.to)} disabled={!petId && a.to.includes('pet')}>
            <span className="icircle"><Icon name={a.icon} /></span>
            <span className="quick-item__text"><b>{a.label}</b><small>{a.sub}</small></span>
            <Icon name="chev" size={20} />
          </button>
        ))}
      </div>
      {!state.pets.length && <Avatar look="juzi" />}
    </Sheet>
  );
}

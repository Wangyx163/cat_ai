import { NavLink } from 'react-router-dom';
import { deriveTasks } from '../store/selectors';
import { useStore } from '../store/StoreContext';
import { Icon } from './icons';

const TABS = [
  { to: '/', label: '家', icon: 'house' },
  { to: '/care', label: '养护', icon: 'shield' },
  { to: '/circle', label: '圈子', icon: 'users' },
  { to: '/me', label: '我的', icon: 'user' },
];

export function TabBar({ onPlus }: { onPlus: () => void }) {
  const { state, today } = useStore();
  const urgent = deriveTasks(state, today).filter((t) => t.urgent).length;
  const help = state.lost.some((l) => !l.mine && !l.resolved);
  const item = (t: (typeof TABS)[number]) => (
    <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `tabbar__item${isActive ? ' tabbar__item--on' : ''}`}>
      <span className="tabbar__icon"><Icon name={t.icon} size={24} />
        {t.to === '/care' && urgent > 0 && <b className="badge" aria-label={`${urgent} 项逾期`}>{urgent}</b>}
        {t.to === '/circle' && help && <b className="badge badge--dot" aria-label="附近有求助" />}
      </span>
      <span>{t.label}</span>
    </NavLink>
  );
  return (
    <nav className="tabbar" aria-label="底部导航">
      {item(TABS[0])}{item(TABS[1])}
      <button type="button" className="tabbar__plus" aria-label="快速记录" onClick={onPlus}><Icon name="plus" size={28} stroke={2.6} /></button>
      {item(TABS[2])}{item(TABS[3])}
    </nav>
  );
}

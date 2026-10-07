import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Look, Weather } from '../domain/types';
import { WEATHER_NAME } from '../domain/weather';
import { useStore } from '../store/StoreContext';
import { asset, avatarSrc } from './assets';
import { Icon, type IconName } from './icons';

type Kind = 'primary' | 'secondary' | 'text' | 'danger';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> { kind?: Kind; size?: 'md' | 'sm'; full?: boolean; icon?: IconName; to?: string }

/** 主按钮（橘色 + 藏青描边 + 硬投影）一屏只放一个 */
export function Btn({ kind = 'primary', size = 'md', full, icon, to, children, className = '', ...rest }: BtnProps) {
  const cls = `btn btn--${kind} btn--${size}${full ? ' btn--full' : ''} ${className}`.trim();
  const inner = <>{icon && <Icon name={icon} size={20} />}<span>{children}</span></>;
  if (to) return <Link className={cls} to={to}>{inner}</Link>;
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}

/** 选项：44px 胶囊按钮，选中 = 晴空蓝浅底 + 勾号 */
export function Chip({ on, children, onClick, small, disabled }: { on?: boolean; children: ReactNode; onClick?: () => void; small?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`chip${on ? ' chip--on' : ''}${small ? ' chip--sm' : ''}`} aria-pressed={!!on} onClick={onClick} disabled={disabled}>
      {on && <Icon name="check" size={16} stroke={2.6} />}<span>{children}</span>
    </button>
  );
}

/** 标签：不可点的小圆角色块，和选项区分开 */
export function Tag({ tone = 'muted', icon, children }: { tone?: string; icon?: IconName; children: ReactNode }) {
  return <span className={`tag tag--${tone}`}>{icon && <Icon name={icon} size={14} />}<span>{children}</span></span>;
}

export function Card({ tone, line, className = '', children }: { tone?: string; line?: boolean; className?: string; children: ReactNode }) {
  return <div className={`card${tone ? ` card--${tone}` : ''}${line ? ' card--line' : ''} ${className}`.trim()}>{children}</div>;
}

export function IconBtn({ icon, label, onClick, to, tone }: { icon: IconName; label: string; onClick?: () => void; to?: string; tone?: string }) {
  const cls = `icon-btn${tone ? ` icon-btn--${tone}` : ''}`;
  if (to) return <Link className={cls} to={to} aria-label={label}><Icon name={icon} /></Link>;
  return <button type="button" className={cls} aria-label={label} onClick={onClick}><Icon name={icon} /></button>;
}

export function Avatar({ look, size = 40, tone = 'sky', alt = '' }: { look: Look; size?: number; tone?: string; alt?: string }) {
  return (
    <span className={`avatar avatar--${tone}`} style={{ width: size, height: size }}>
      <img src={avatarSrc(look)} alt={alt} width={size} height={size} />
    </span>
  );
}

export function WeatherBadge({ w, size = 28 }: { w: Weather; size?: number }) {
  return (
    <span className={`wbadge wbadge--${w}`} style={{ width: size, height: size }} role="img" aria-label={`今日天气：${WEATHER_NAME[w]}`}>
      <Icon name={w} size={Math.round(size * 0.62)} />
    </span>
  );
}

export function FishPill({ n }: { n: number }) {
  return (
    <span className="fish-pill" aria-label={`小鱼干 ${n}`}>
      <img src={asset('icon_fish')} alt="" width={30} height={14} />
      <span>{n}</span>
    </span>
  );
}

export function TopBar({ title, back = -1, right }: { title: string; back?: string | number; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      <IconBtn icon="back" label="返回" onClick={() => (typeof back === 'number' ? nav(back) : nav(back))} />
      <h1 className="topbar__title">{title}</h1>
      {right}
    </header>
  );
}

export function Progress({ value }: { value: number }) {
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${value}%` }} /></div>;
}

export function Segmented<T extends string>({ options, value, onChange, labels, sub }: { options: T[]; value: T; onChange: (v: T) => void; labels: Record<T, string>; sub?: Partial<Record<T, string>> }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o} type="button" role="tab" aria-selected={o === value} className={`seg__item${o === value ? ' seg__item--on' : ''}`} onClick={() => onChange(o)}>
          {sub?.[o] && <small>{sub[o]}</small>} {labels[o]}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" aria-label="关闭弹层" onClick={onClose} />
      <div className="sheet">
        <div className="sheet__handle" />
        <div className="sheet__head"><h2>{title}</h2><IconBtn icon="x" label="关闭" onClick={onClose} /></div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}

export function Toast() {
  const { state, dispatch } = useStore();
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: 'toast' }), 2600);
    return () => clearTimeout(t);
  }, [state.toast, dispatch]);
  return <div className="toast" role="status" aria-live="polite">{state.toast && <span>{state.toast}</span>}</div>;
}

export function Empty({ img, title, children }: { img: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <img src={asset(img)} alt="" />
      <p className="empty__title">{title}</p>
      {children}
    </div>
  );
}

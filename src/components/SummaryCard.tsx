import { forwardRef } from 'react';
import type { Summary } from '../domain/summary';
import type { Look } from '../domain/types';
import { Avatar } from './ui';

/** 就诊摘要：诊室模式（白底细线、系统字体、等宽数字），给医生看 */
export const SummaryCard = forwardRef<HTMLDivElement, { summary: Summary; look: Look; date: string; note?: string }>(function SummaryCard({ summary, look, date, note }, ref) {
  return (
    <div className="card card--line summary" ref={ref}>
      <div className="row summary__head">
        <Avatar look={look} size={40} />
        <div className="grow"><b className="h3">{summary.title}</b><br /><small className="muted">{summary.subtitle}</small></div>
        <small className="muted">{date} 生成</small>
      </div>
      <dl className="kv">
        {summary.rows.map((r) => (<div key={r.k} className="kv__row"><dt>{r.k}</dt><dd className="num">{r.v}</dd></div>))}
      </dl>
      <small className="muted">{note ?? '仅供参考，不能替代兽医诊断'}</small>
    </div>
  );
});

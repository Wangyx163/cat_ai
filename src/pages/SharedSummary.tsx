import { useParams, useSearchParams } from 'react-router-dom';
import { SummaryCard } from '../components/SummaryCard';
import { Empty } from '../components/ui';
import { fmtMD } from '../domain/dates';
import { buildSummary } from '../domain/summary';
import { findPet } from '../store/selectors';
import { useStore } from '../store/StoreContext';

/** 医生打开的分享页：只读、24 小时失效。演示版无后端，链接在同一设备上有效 */
export default function SharedSummary() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const { state, today } = useStore();
  const exp = Number(sp.get('exp') ?? 0);
  const session = state.checks.find((c) => c.id === id);
  const pet = session ? findPet(state, session.petId) : undefined;
  if (!session || !pet) return <div className="page page--cool"><Empty img="empty_timeline" title="没有找到这份摘要" /></div>;
  if (!exp || Date.now() > exp) return <div className="page page--cool"><Empty img="empty_timeline" title="链接已失效">请让主人重新生成一次。</Empty></div>;
  return (
    <div className="page page--cool">
      <h1 className="h2 page-title">就诊摘要 · {pet.name}</h1>
      <SummaryCard summary={buildSummary(state, pet.id, session, today)} look={pet.look} date={fmtMD(session.date)} />
    </div>
  );
}

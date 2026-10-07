import { Link, useParams } from 'react-router-dom';
import { asset, petImage } from '../components/assets';
import { Avatar, Btn, Card, Empty, Tag, TopBar } from '../components/ui';
import { LIMITS } from '../store/reducer';
import { useStore } from '../store/StoreContext';

/** 云串门（猫友主场）：逛别人家的公开视图，送小鱼干；互相串门后成为宠友 */
export default function VisitPage() {
  const { homeId } = useParams();
  const { state, dispatch, today } = useStore();
  const home = state.homes.find((h) => h.id === homeId);
  if (homeId && !home) return <div className="page"><TopBar title="云串门" back="/circle/visit" /><Empty img="empty_nearby" title="这家暂时不开放" /></div>;
  if (home) {
    const used = state.visitsSent[`${home.id}|${today}`] ?? 0;
    return (
      <div className="page">
        <TopBar title={`${home.owner}的家`} back="/circle/visit" />
        <div className="scene scene--visit">
          <img className="scene__room" src={asset('scene_room')} alt="" />
          <img className="scene__guest" src={petImage(home.look, 'happy').src} alt={home.petName} />
        </div>
        <p className="muted">只展示卡通形象和公开动态，不显示位置与主人信息。</p>
        <Btn full disabled={used >= LIMITS.visitFishPerHomePerDay} onClick={() => dispatch({ type: 'home/fish', homeId: home.id, date: today })}>
          给{home.petName}送小鱼干（今天还能送 {LIMITS.visitFishPerHomePerDay - used} 次）</Btn>
        {home.friend ? <Tag tone="green">已互相串门，成为宠友</Tag> : <small className="muted">再来串一次门，就能和{home.owner}互关成宠友。</small>}
      </div>
    );
  }
  return (
    <div className="page">
      <TopBar title="云串门" back="/circle" />
      <p className="muted">猫咪不适合约玩，就让「家」去串门。</p>
      {state.homes.map((h) => (
        <Link key={h.id} className="card card-link" to={`/circle/visit/${h.id}`}>
          <div className="row"><Avatar look={h.look} size={48} /><div className="grow"><b>{h.owner}的家</b><br /><small className="muted">住着 {h.petName}</small></div>{h.friend && <Tag tone="green">宠友</Tag>}</div>
        </Link>
      ))}
      <Card><small className="muted">每天给同一家最多送 {LIMITS.visitFishPerHomePerDay} 次，防止刷量。</small></Card>
    </div>
  );
}

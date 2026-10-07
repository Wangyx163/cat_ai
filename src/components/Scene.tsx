import { Link } from 'react-router-dom';
import type { Pet, Weather } from '../domain/types';
import { POSE_OF } from '../domain/weather';
import type { PetWeather } from '../store/selectors';
import { asset, petImage, RATIO } from './assets';
import { WeatherBadge } from './ui';

const W = 358;
const H = 268;
const px = (v: number) => `${(v / W) * 100}%`;
const py = (v: number) => `${(v / H) * 100}%`;
const OBJECTS: { key: string; x: number; y: number; w: number; label: string; aria: string; to: (petId: string) => string }[] = [
  { key: 'obj_frame', x: 162, y: 22, w: 38, label: '相册', aria: '相框：成长相册', to: (p) => `/pet/${p}?tab=grow` },
  { key: 'obj_calendar', x: 214, y: 30, w: 36, label: '计划', aria: '挂历：养护计划', to: (p) => `/plan/${p}` },
  { key: 'obj_door', x: 296, y: 100, w: 56, label: '圈子', aria: '小门：去圈子', to: () => '/circle' },
  { key: 'obj_scale', x: 10, y: 196, w: 56, label: '称重', aria: '体重秤：去称重', to: (p) => `/care?pet=${p}&weigh=1` },
  { key: 'obj_medkit', x: 310, y: 198, w: 40, label: '护盾', aria: '医药箱：查看护盾', to: (p) => `/care?pet=${p}` },
];
const SLOTS = [{ cx: 106, bottom: 234 }, { cx: 264, bottom: 233 }, { cx: 197, bottom: 241 }];
const POSE_W = { happy: 88, calm: 74, unwell: 98 };
const RANK: Record<Weather, number> = { sun: 0, cloud: 1, rain: 2, alert: 3 };
const needsProfile = (p: Pet) => !p.birthday || p.neutered === undefined || !p.lifestyle;

/** 「XX的家」：宠物用姿势表达今天的状态，房间里的物件就是入口 */
export function Scene({ pets, weathers, interactive = true }: { pets: Pet[]; weathers: Record<string, PetWeather>; interactive?: boolean }) {
  const first = pets[0]?.id ?? '';
  const shown = [...pets.slice(0, 3)].sort((a, b) => RANK[weathers[a.id]?.level ?? 'sun'] - RANK[weathers[b.id]?.level ?? 'sun']);
  const order = shown.length === 3 ? [shown[0], shown[1], shown[2]] : shown;
  const wrap = (to: string, label: string, cls: string, style: React.CSSProperties, children: React.ReactNode, key: string) =>
    interactive ? <Link key={key} to={to} aria-label={label} className={cls} style={style}>{children}</Link> : <div key={key} className={cls} style={style}>{children}</div>;

  return (
    <div className="scene" aria-label="家的场景">
      <img className="scene__room" src={asset('scene_room')} alt="" />
      {pets.length > 0 && OBJECTS.map((o) => wrap(o.to(first), o.aria, 'scene__obj', { left: px(o.x), top: py(o.y), width: px(o.w) },
        <><img src={asset(o.key)} alt="" style={{ aspectRatio: String(RATIO[o.key]) }} /><span>{o.label}</span></>, o.key))}
      {order.map((p, i) => {
        const wthr = weathers[p.id]?.level ?? 'sun';
        const pose = POSE_OF[wthr];
        const img = petImage(p.look, pose);
        const slot = SLOTS[order.length === 3 ? i : i === 0 ? 0 : 1];
        const w = POSE_W[pose];
        const h = w / img.ratio;
        const left = slot.cx - w / 2;
        const top = slot.bottom - h;
        const sick = wthr === 'rain' || wthr === 'alert';
        const to = sick ? `/check/${p.id}` : `/pet/${p.id}`;
        return (
          <div key={p.id}>
            <div className="scene__shade" style={{ left: px(slot.cx - w * 0.34), top: py(slot.bottom - 8), width: px(w * 0.68) }} />
            {wrap(to, `${p.name}，今天${sick ? '有点不舒服，去做状态检测' : '状态不错，查看详情'}`, 'scene__pet', { left: px(left), top: py(top), width: px(w) },
              <img src={img.src} alt={p.name} style={{ aspectRatio: String(img.ratio) }} />, `pet-${p.id}`)}
            {sick && wrap(`/check/${p.id}`, `${p.name}${wthr === 'alert' ? '需就医' : '有点不舒服'}`, 'scene__bubble', { left: px(slot.cx - 34), top: py(top - 28) },
              <><WeatherBadge w={wthr} size={20} /><span>{wthr === 'alert' ? '需就医' : '不舒服'}</span></>, `bubble-${p.id}`)}
            {!sick && needsProfile(p) && wrap(`/pet/${p.id}?tab=profile`, `补全${p.name}的档案`, 'scene__bubble scene__bubble--ask', { left: px(slot.cx - 12), top: py(top - 26) },
              <span>?</span>, `ask-${p.id}`)}
          </div>
        );
      })}
      {pets.length > 3 && <Link className="scene__more" to="/me">+{pets.length - 3}</Link>}
    </div>
  );
}

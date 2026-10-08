import type { Look, Pose, Species } from '../domain/types';

export const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}.webp`;

/** 插画宽高比（宽 / 高），布局按比例计算，避免图片加载前跳动 */
export const RATIO: Record<string, number> = {
  pet_juzi_happy: 628 / 599, pet_juzi_calm: 509 / 593, pet_juzi_unwell: 700 / 331,
  pet_zhima_happy: 585 / 623, pet_zhima_calm: 523 / 631, pet_zhima_unwell: 700 / 365,
  pet_doubao_happy: 616 / 622, pet_doubao_calm: 532 / 615, pet_doubao_unwell: 700 / 389,
  pet_kele_happy: 594 / 700, obj_scale: 358 / 259, obj_medkit: 314 / 327, obj_calendar: 272 / 340,
  obj_door: 286 / 355, obj_frame: 285 / 381, icon_fish: 256 / 88, icon_bone: 256 / 128,
  body_cat: 900 / 679, body_dog: 900 / 644, card_milestone: 814 / 1086, card_monthly: 814 / 1086,
  empty_nearby: 640 / 475, empty_timeline: 502 / 640, scene_room: 1448 / 1086,
  entry_walk: 360 / 215, entry_visit: 360 / 303, entry_lost: 358 / 360, entry_foster: 360 / 274,
  feed_cat_window: 600 / 800, walk_party: 1200 / 675,
  tab_home: 256 / 235, tab_care: 256 / 235, tab_plus: 255 / 256, tab_circle: 256 / 138, tab_me: 253 / 256,
  quick_check: 256 / 245, quick_moment: 256 / 204, quick_post: 256 / 231,
  shield_in: 251 / 256, shield_out: 256 / 253, shield_core: 256 / 234, shield_rabies: 256 / 236,
  weather_sun: 256 / 255, weather_cloud: 256 / 212, weather_rain: 256 / 251, weather_alert: 256 / 217,
};

export function petImage(look: Look, pose: Pose) {
  const key = look === 'kele' ? 'pet_kele_happy' : `pet_${look}_${pose}`;
  return { key, src: asset(key), ratio: RATIO[key] };
}
export const avatarSrc = (look: Look) => asset(`avatar_${look}`);

/** 养护项目对应的插画图标（没有的项目继续用线性图标） */
export const KIND_ICON: Record<string, string> = {
  deworm_in: 'shield_in', deworm_out: 'shield_out', vaccine_core: 'shield_core', vaccine_rabies: 'shield_rabies', weigh: 'obj_scale', checkup: 'obj_calendar',
};

/** 形象库：先提供四种常见形象，后续再做参数化自定义 */
export const LOOKS: Record<Look, { species: Species; breed: string; label: string }> = {
  juzi: { species: 'cat', breed: '中华田园猫', label: '橘猫' },
  zhima: { species: 'cat', breed: '英短', label: '蓝猫' },
  doubao: { species: 'dog', breed: '柯基', label: '柯基' },
  kele: { species: 'dog', breed: '柴犬', label: '柴犬' },
};

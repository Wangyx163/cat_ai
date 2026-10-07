import type { Look, Pose, Species } from '../domain/types';

export const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}.webp`;

/** 插画宽高比（宽 / 高），布局按比例计算，避免图片加载前跳动 */
export const RATIO: Record<string, number> = {
  pet_juzi_happy: 628 / 599, pet_juzi_calm: 509 / 593, pet_juzi_unwell: 700 / 331,
  pet_zhima_happy: 585 / 623, pet_zhima_calm: 523 / 631, pet_zhima_unwell: 700 / 365,
  pet_doubao_happy: 616 / 622, pet_doubao_calm: 532 / 615, pet_doubao_unwell: 700 / 389,
  pet_kele_happy: 594 / 700, obj_scale: 358 / 259, obj_medkit: 314 / 327, obj_calendar: 272 / 340,
  obj_door: 286 / 355, obj_frame: 285 / 381, icon_fish: 256 / 116, icon_bone: 256 / 128,
  body_cat: 900 / 679, body_dog: 900 / 644, card_milestone: 814 / 1086, card_monthly: 814 / 1086,
  empty_nearby: 640 / 475, empty_timeline: 504 / 640, scene_room: 1448 / 1086,
};

export function petImage(look: Look, pose: Pose) {
  const key = look === 'kele' ? 'pet_kele_happy' : `pet_${look}_${pose}`;
  return { key, src: asset(key), ratio: RATIO[key] };
}
export const avatarSrc = (look: Look) => asset(`avatar_${look}`);

/** 形象库：先提供四种常见形象，后续再做参数化自定义 */
export const LOOKS: Record<Look, { species: Species; breed: string; label: string }> = {
  juzi: { species: 'cat', breed: '中华田园猫', label: '橘猫' },
  zhima: { species: 'cat', breed: '英短', label: '蓝猫' },
  doubao: { species: 'dog', breed: '柯基', label: '柯基' },
  kele: { species: 'dog', breed: '柴犬', label: '柴犬' },
};

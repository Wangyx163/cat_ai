import type { TriageLevel } from './types';

/** 红旗症状：任一项直接建议尽快就医（先筛急症，再问细节） */
export const RED_FLAGS = ['完全不吃超过 24 小时', '反复呕吐', '呼吸困难或张口喘气', '频繁蹲砂盆却尿不出', '抽搐', '误食异物或疑似中毒', '明显外伤出血'];
export const BODY_PARTS = ['头面部', '皮肤毛发', '肚子', '四肢', '屁股尾巴'];
export const SYMPTOMS = ['少吃', '便便偏软', '呕吐', '腹泻', '没精神', '喝水变多'];
export const DURATIONS = ['今天', '2–3 天', '一周以上'];

export function triage(i: { redFlags: string[]; symptoms: string[]; duration: string }): TriageLevel {
  if (i.redFlags.length) return 'emergency';
  const severe = i.symptoms.filter((s) => s === '呕吐' || s === '腹泻').length;
  if (i.duration !== '今天' || severe >= 2 || i.symptoms.length >= 3) return 'appointment';
  return 'observe';
}

export const LEVEL_TEXT: Record<TriageLevel, { title: string; body: string }> = {
  emergency: { title: '建议尽快就医', body: '出现了需要尽快处理的情况，请先联系医院，路上可以把就诊摘要发给医生。' },
  appointment: { title: '建议预约就诊', body: '没有紧急情况，但症状持续或较多，建议近期预约兽医看看。' },
  observe: { title: '可以先观察', body: '症状较轻，明天的每日一问会追问一句；如果加重请随时就医。' },
};

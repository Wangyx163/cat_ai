import type { Pose, Weather } from './types';

/** 每日一问只记例外：都挺好一键完成，不对劲才多选这些 */
export const DAILY_ISSUES = ['没精神', '少吃', '不吃', '便便偏软', '腹泻', '呕吐', '喝水变多', '其他'];
/** 计分为可配置的演示默认值：满分 100，按例外扣分 */
export const ISSUE_WEIGHT: Record<string, number> = {
  没精神: 25, 少吃: 20, 不吃: 45, 便便偏软: 10, 腹泻: 30, 没拉: 15, 呕吐: 25, 喝水变多: 15, 喝水变少: 15, 打喷嚏: 10, 抓挠: 10, 其他: 10,
};
export const PENALTY = { overdue: 10, weightAnomaly: 15 };

export function weatherScore(issues: string[], o: { overdue?: boolean; weightAnomaly?: boolean } = {}): number {
  const s = 100 - issues.reduce((t, i) => t + (ISSUE_WEIGHT[i] ?? 10), 0)
    - (o.overdue ? PENALTY.overdue : 0) - (o.weightAnomaly ? PENALTY.weightAnomaly : 0);
  return Math.max(0, Math.min(100, s));
}

/** ≥85 晴，65–84 多云，40–64 小雨，<40 或任一红旗为「需就医」（严重时隐喻退场） */
export function weatherLevel(score: number, redFlag = false): Weather {
  if (redFlag || score < 40) return 'alert';
  if (score < 65) return 'rain';
  if (score < 85) return 'cloud';
  return 'sun';
}
export const WEATHER_NAME: Record<Weather, string> = { sun: '晴', cloud: '多云', rain: '小雨', alert: '需就医' };
export const POSE_OF: Record<Weather, Pose> = { sun: 'happy', cloud: 'calm', rain: 'unwell', alert: 'unwell' };

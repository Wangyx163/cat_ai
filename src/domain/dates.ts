/** 日期统一用本地日期字符串 YYYY-MM-DD，避免时区带来的跨天误差 */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: ISODate): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = (): ISODate => toISO(new Date());
export const addDays = (s: ISODate, n: number): ISODate => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
/** a - b 相差的天数 */
export const diffDays = (a: ISODate, b: ISODate): number =>
  Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);
export const fmtMD = (s: ISODate) => { const d = parseISO(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const fmtYM = (s: ISODate) => { const d = parseISO(s); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}`; };
export const fmtFull = (s: ISODate) => { const d = parseISO(s); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; };
export const monthKey = (s: ISODate) => s.slice(0, 7);
export const monthLabel = (key: string) => `${key.slice(0, 4)} 年 ${Number(key.slice(5, 7))} 月`;
/** 按日历计算的整月数（生日当天满月），避免「天数 ÷ 30」在边界上少算一个月 */
export function monthsBetween(from: ISODate, to: ISODate): number {
  const a = parseISO(from);
  const b = parseISO(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);
}
export function ageText(birthday: ISODate, today: ISODate): string {
  const months = monthsBetween(birthday, today);
  if (months < 1) return '不到 1 个月';
  return months < 12 ? `${months} 个月` : `${Math.floor(months / 12)} 岁`;
}

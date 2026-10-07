import type { WeightPoint } from '../domain/weight';

/** 体重曲线：叠加兽医建议区间带；没有区间时只看趋势，不判断胖瘦 */
export function Sparkline({ points, range, width = 320, height = 64 }: { points: WeightPoint[]; range?: [number, number]; width?: number; height?: number }) {
  const pts = [...points].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
  if (pts.length < 2) return <p className="hint">再称两次就能看到曲线啦</p>;
  const vals = pts.map((p) => p.kg).concat(range ?? []);
  const min = Math.min(...vals) - 0.2;
  const max = Math.max(...vals) + 0.2;
  const y = (v: number) => height - 6 - ((v - min) / (max - min)) * (height - 12);
  const x = (i: number) => 8 + (i * (width - 16)) / (pts.length - 1);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  return (
    <svg className="spark" width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`最近 ${pts.length} 次体重，从 ${pts[0].kg} 到 ${pts[pts.length - 1].kg} kg`}>
      {range && <rect x="0" y={y(range[1])} width={width} height={Math.max(2, y(range[0]) - y(range[1]))} rx="6" className="spark__band" />}
      <polyline points={line} className="spark__line" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].kg)} r="5" className="spark__dot" />
    </svg>
  );
}

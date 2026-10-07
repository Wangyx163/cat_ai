/** 位置只存 geohash 前 6 位（约 1.2 km × 0.6 km 的格子），界面只显示距离区间 */
const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat: number, lon: number, precision = 6): string {
  const latR = [-90, 90];
  const lonR = [-180, 180];
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    const r = even ? lonR : latR;
    const v = even ? lon : lat;
    const mid = (r[0] + r[1]) / 2;
    if (v >= mid) { ch = (ch << 1) | 1; r[0] = mid; } else { ch <<= 1; r[1] = mid; }
    even = !even;
    if (++bit === 5) { hash += B32[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

export function decodeGeohash(hash: string): { lat: number; lon: number } {
  const latR = [-90, 90];
  const lonR = [-180, 180];
  let even = true;
  for (const c of hash) {
    const n = B32.indexOf(c);
    for (let b = 4; b >= 0; b--) {
      const r = even ? lonR : latR;
      const mid = (r[0] + r[1]) / 2;
      if ((n >> b) & 1) r[0] = mid; else r[1] = mid;
      even = !even;
    }
  }
  return { lat: (latR[0] + latR[1]) / 2, lon: (lonR[0] + lonR[1]) / 2 };
}

export function distanceKm(a: string, b: string): number {
  const p = decodeGeohash(a);
  const q = decodeGeohash(b);
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(q.lat - p.lat);
  const dLon = rad(q.lon - p.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(p.lat)) * Math.cos(rad(q.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const distanceLabel = (km: number) => (km <= 1 ? '1 公里内' : km <= 3 ? '3 公里内' : '3 公里外');

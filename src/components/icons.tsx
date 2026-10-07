const P: Record<string, string> = {
  house: '<path d="M3 11 L12 4 L21 11"/><path d="M5.5 9.5 V20 H18.5 V9.5"/><path d="M10 20 V15 H14 V20"/>',
  shield: '<path d="M12 3 L19 6 V11 C19 16 15.5 19.5 12 21 C8.5 19.5 5 16 5 11 V6 Z"/>',
  plus: '<path d="M12 5 V19"/><path d="M5 12 H19"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19 C3.5 15.5 6 13.5 9 13.5 C12 13.5 14.5 15.5 15 19"/><circle cx="17" cy="9" r="2.5"/><path d="M15.6 13.6 C18.4 13.8 20.4 15.8 20.8 19"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20 C4.8 16 8 14 12 14 C16 14 19.2 16 20 20"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2 V4.5 M12 19.5 V22 M2 12 H4.5 M19.5 12 H22 M4.9 4.9 L6.6 6.6 M17.4 17.4 L19.1 19.1 M4.9 19.1 L6.6 17.4 M17.4 6.6 L19.1 4.9"/>',
  cloud: '<path d="M7 18 H17 A4 4 0 0 0 17.5 10.03 A6 6 0 0 0 6.1 11.2 A3.5 3.5 0 0 0 7 18 Z"/>',
  rain: '<path d="M7 14 H17 A4 4 0 0 0 17.5 6.03 A6 6 0 0 0 6.1 7.2 A3.5 3.5 0 0 0 7 14 Z"/><path d="M8 17.5 L7 20.5 M12 17.5 L11 20.5 M16 17.5 L15 20.5"/>',
  alert: '<path d="M12 4 L21 19.5 H3 Z"/><path d="M12 10 V14"/><path d="M12 17 V17.2"/>',
  bell: '<path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L19.5 18 H4.5 Z"/><path d="M10 20.5 A2 2 0 0 0 14 20.5"/>',
  scale: '<rect x="3" y="5" width="18" height="15" rx="4"/><path d="M8 10.5 A4 4 0 0 1 16 10.5"/><path d="M12 10.5 L14 8.5"/>',
  paw: '<circle cx="12" cy="15.5" r="3.6"/><circle cx="6.5" cy="10.5" r="1.9"/><circle cx="10" cy="6.8" r="1.9"/><circle cx="14" cy="6.8" r="1.9"/><circle cx="17.5" cy="10.5" r="1.9"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10 H21 M8 3 V7 M16 3 V7"/>',
  heart: '<path d="M12 20 C12 20 5 15.5 5 10 A4 4 0 0 1 12 7.4 A4 4 0 0 1 19 10 C19 15.5 12 20 12 20 Z"/>',
  chat: '<path d="M4 5 H20 V16 H9 L4 20 Z"/>',
  share: '<path d="M12 3 V15"/><path d="M7 8 L12 3 L17 8"/><path d="M5 14 V20 H19 V14"/>',
  pin: '<path d="M12 21 C12 21 6 15.5 6 10 A6 6 0 0 1 18 10 C18 15.5 12 21 12 21 Z"/><circle cx="12" cy="10" r="2.2"/>',
  check: '<path d="M5 12.5 L9.5 17 L19 7"/>',
  x: '<path d="M6 6 L18 18 M18 6 L6 18"/>',
  chev: '<path d="M9 6 L15 12 L9 18"/>',
  back: '<path d="M15 6 L9 12 L15 18"/>',
  medal: '<path d="M8 3 L12 9 L16 3"/><circle cx="12" cy="15" r="5"/><path d="M12 12.8 V17.2"/>',
  pill: '<rect x="2.8" y="8.5" width="18.4" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.2 9 L14.4 14.2"/>',
  syringe: '<path d="M17 3 L21 7"/><path d="M19 5 L9 15 L6 15 L6 12 L16 2"/><path d="M3 21 L6 18"/><path d="M11 8 L13 10"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5 V12 L15 14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16 L20.5 20.5"/>',
  link: '<path d="M10 14 L14 10"/><path d="M8.5 11.5 L6.5 13.5 A3 3 0 0 0 10.5 17.5 L12.5 15.5"/><path d="M15.5 12.5 L17.5 10.5 A3 3 0 0 0 13.5 6.5 L11.5 8.5"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14 H16 V16 M20 14 V16 M14 20 H20 V18"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17 L9.5 12.5 L13 15.5 L16 13 L20 16.5"/>',
  tooth: '<path d="M7 4 C4.5 4 4 6.5 4.5 9 C5 12 6 14 6.5 17 C7 20 8.5 20.5 9.2 18 L10.5 14 C11 13 13 13 13.5 14 L14.8 18 C15.5 20.5 17 20 17.5 17 C18 14 19 12 19.5 9 C20 6.5 19.5 4 17 4 C15 4 14 5 12 5 C10 5 9 4 7 4 Z"/>',
  door: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M14.5 12 V12.2"/>',
  spark: '<path d="M12 3 L13.8 9.2 L20 11 L13.8 12.8 L12 19 L10.2 12.8 L4 11 L10.2 9.2 Z"/>',
  camera: '<path d="M4 8 H8 L9.5 5.5 H14.5 L16 8 H20 V19 H4 Z"/><circle cx="12" cy="13" r="3.5"/>',
  edit: '<path d="M4 20 H8 L19 9 L15 5 L4 16 Z"/><path d="M13 7 L17 11"/>',
  download: '<path d="M12 4 V15"/><path d="M7 10 L12 15 L17 10"/><path d="M5 20 H19"/>',
  phone: '<path d="M6 3 H9 L10.5 7.5 L8.5 9 C9.5 11.5 12.5 14.5 15 15.5 L16.5 13.5 L21 15 V18 C21 19.5 19.5 21 18 21 C10 20.5 3.5 14 3 6 C3 4.5 4.5 3 6 3 Z"/>',
};
export type IconName = keyof typeof P | string;

export function Icon({ name, size = 22, stroke = 2, color = 'currentColor' }: { name: IconName; size?: number; stroke?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="icon"
      style={{ fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', flex: 'none' }}
      dangerouslySetInnerHTML={{ __html: P[name] ?? '' }} />
  );
}

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** 真实可扫的二维码（SVG），离线生成，不依赖网络 */
export function QR({ text, size = 120, label }: { text: string; size?: number; label: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: 'svg', margin: 0, width: size, color: { dark: '#082C5C', light: '#FFFFFF' } })
      .then((s) => { if (alive) setSvg(s); })
      .catch(() => setSvg(''));
    return () => { alive = false; };
  }, [text, size]);
  return <span className="qr" role="img" aria-label={label} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

import type { Order } from '../types';

/**
 * ISO/IEC 15417 Standard Code-128 Barcode Patterns (Values 0..106)
 * Each pattern encodes 11 modules (6 alternating bar/space widths), except Stop (106) which is 13 modules.
 */
const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131',
  '211412', // 103: Start Code A
  '211214', // 104: Start Code B
  '211232', // 105: Start Code C
  '2331112', // 106: Stop (13 modules)
];

const START_CODE_B = 104;
const START_CODE_C = 105;
const STOP_CODE = 106;

/**
 * Escapes untrusted strings before interpolating into printable HTML/SVG labels.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Encodes an alphanumeric or numeric AWB string into valid ISO/IEC 15417 Code-128 symbol values
 * (using high-density Code-128C when the value is purely numeric with even digit length, and Code-128B otherwise).
 */
export function encodeCode128Values(rawText: string): number[] {
  const clean = String(rawText || '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '');

  if (!clean) {
    return [];
  }

  const codes: number[] = [];
  const isEvenDigitsOnly = /^\d+$/.test(clean) && clean.length >= 4 && clean.length % 2 === 0;

  if (isEvenDigitsOnly) {
    codes.push(START_CODE_C);
    for (let i = 0; i < clean.length; i += 2) {
      codes.push(parseInt(clean.slice(i, i + 2), 10));
    }
  } else {
    codes.push(START_CODE_B);
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i);
      const val = charCode - 32;
      if (val >= 0 && val <= 95) {
        codes.push(val);
      }
    }
  }

  // Exact Modulo-103 checksum calculation
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP_CODE);

  return codes;
}

/**
 * Generates a crisp, optically scannable ISO/IEC 15417 Code-128 SVG string
 * with mandatory 10-module quiet zones on both sides.
 */
export function generateCode128Svg(
  rawText: string,
  options?: {
    height?: number;
    moduleWidth?: number;
    quietZoneModules?: number;
    showHumanText?: boolean;
  }
): string {
  const clean = String(rawText || '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '');
  const codes = encodeCode128Values(clean);
  if (codes.length === 0) {
    return '';
  }

  const height = options?.height ?? 56;
  const moduleWidth = options?.moduleWidth ?? 2;
  const quietZone = options?.quietZoneModules ?? 10;
  const showHumanText = options?.showHumanText ?? false;
  const textHeight = showHumanText ? 18 : 0;

  let cursorModules = quietZone;
  const rects: string[] = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const width = Number(pattern[i]);
      const isBar = i % 2 === 0;
      if (isBar) {
        rects.push(
          `<rect x="${cursorModules * moduleWidth}" y="0" width="${width * moduleWidth}" height="${height}" fill="#000000" />`
        );
      }
      cursorModules += width;
    }
  }

  const totalWidth = (cursorModules + quietZone) * moduleWidth;
  const totalHeight = height + textHeight;

  const textEl = showHumanText
    ? `<text x="${totalWidth / 2}" y="${height + 14}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="#000000" letter-spacing="1.5">${escapeHtml(clean)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="${totalHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Code 128 Barcode ${escapeHtml(clean)}" shape-rendering="crispEdges"><rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />${rects.join('')}${textEl}</svg>`;
}

/**
 * Extracts the AWB assigned to an order (if any).
 */
export function getOrderAwbNumber(order?: Order | null): string {
  if (!order) return '';
  const raw =
    order.awb_number ||
    order.shipmozo?.awb ||
    (order as unknown as { shipment?: { awb?: string } })?.shipment?.awb ||
    '';
  return String(raw).trim();
}

/**
 * Checks whether an order has a genuine live Delhivery AWB (and not a locally fabricated placeholder).
 */
export function hasRealDelhiveryAwb(order?: Order | null): boolean {
  if (!order) return false;
  const awb = getOrderAwbNumber(order);
  if (!awb || awb.length < 8) return false;
  if (awb.startsWith('RM') && awb.endsWith('IN')) return false;
  if (order.awbSource === 'manual') return false;
  // Reject old locally randomized 606696XXXXXXXX placeholders unless explicitly created via live Delhivery API
  if (/^606696\d{8}$/.test(awb) && order.awbSource !== 'delhivery_live') return false;
  if (order.awbSource === 'delhivery_live') return true;
  // Backward compatibility for existing orders already manifested via Delhivery CMU before awbSource was added
  const hasCmuHistory = Boolean(
    order.shipmozo?.history?.some((h) => /delhivery cmu manifested/i.test(String(h?.status || '')))
  );
  if (hasCmuHistory) return true;
  return Boolean(order.delhiveryShipmentStatus === 'created');
}

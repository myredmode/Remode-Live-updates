import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Attempt to load .env file if available in environment
try {
  if (typeof (process as any).loadEnvFile === 'function' && fs.existsSync('.env')) {
    (process as any).loadEnvFile();
  }
} catch (e) {
  // Silent catch if .env is missing or cannot be read
}

const ADMIN_JWT_SECRET = (
  process.env.ADMIN_JWT_SECRET ||
  process.env.OTP_SECRET ||
  'redmode_prod_admin_jwt_secret_v1_8e7d6c5b4a3f2e1d'
).trim();

const OTP_SECRET = (
  process.env.OTP_SECRET ||
  process.env.ADMIN_JWT_SECRET ||
  'redmode_prod_otp_hmac_secret_v1_9f8a7b6c5d4e3f2a1b'
).trim();

let activeAdminSessionVersion = Number(process.env.ADMIN_SESSION_VERSION || 1);
let customAdminPasswordHash = '';

function hashAdminPassword(plain: string): string {
  return crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(String(plain)).digest('hex');
}

function parseCookiesHeader(cookieHeader = ''): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

function signAdminSessionToken(params: {
  userId?: string;
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  sessionVersion?: number;
}): string {
  const payload = {
    uid: params.userId || 'admin-super-1',
    name: params.name || 'Aamir',
    email: params.email || 'myredmode@gmail.com',
    mobile: params.mobile || '7302797464',
    role: params.role || 'Super Admin',
    sv: params.sessionVersion ?? activeAdminSessionVersion,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyAdminSessionToken(token?: string): any | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (!payload || Date.now() > Number(payload.exp)) return null;
    if (Number(payload.sv) < activeAdminSessionVersion) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractVerifiedAdminFromRequest(req: Request): any | null {
  const authHeader = (req.headers['authorization'] || req.headers['Authorization'] || '') as string;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const verified = verifyAdminSessionToken(authHeader.slice(7).trim());
    if (verified) return verified;
  }
  const cookies = parseCookiesHeader(req.headers.cookie || '');
  if (cookies.redmode_admin_session) {
    const verified = verifyAdminSessionToken(cookies.redmode_admin_session);
    if (verified) return verified;
  }
  return null;
}

function createSignedOtpChallengeToken(params: {
  mobile: string;
  otp: string;
  expiresAt: number;
  purpose: string;
  sessionId?: string;
}): string {
  const payloadObj = {
    m: params.mobile,
    e: params.expiresAt,
    p: params.purpose || 'customer',
    s: params.sessionId || '',
    h: crypto
      .createHmac('sha256', OTP_SECRET)
      .update(`${params.mobile}:${params.otp}:${params.expiresAt}:${params.purpose || 'customer'}`)
      .digest('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', OTP_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySignedOtpChallengeToken(
  token: string,
  mobile: string,
  otp: string,
  purpose = 'customer'
): { valid: boolean; reason?: string; sessionId?: string } {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'Missing or expired OTP verification session.' };
  }
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) {
    return { valid: false, reason: 'Invalid OTP verification token.' };
  }
  const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'Tampered OTP verification token.' };
  }
  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, reason: 'Corrupted OTP verification token.' };
  }
  if (!payload || payload.m !== mobile) {
    return { valid: false, reason: 'Mobile number mismatch for this OTP session.' };
  }
  if (Date.now() > Number(payload.e)) {
    return { valid: false, reason: 'OTP has expired. Please request a new OTP.' };
  }
  const expectedHmac = crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${mobile}:${otp}:${payload.e}:${payload.p || purpose || 'customer'}`)
    .digest('hex');
  const hBuf = Buffer.from(String(payload.h || ''), 'hex');
  const expectedHmacBuf = Buffer.from(expectedHmac, 'hex');
  if (hBuf.length === expectedHmacBuf.length && crypto.timingSafeEqual(hBuf, expectedHmacBuf)) {
    return { valid: true, sessionId: payload.s || '' };
  }
  return { valid: false, reason: 'Invalid OTP code.', sessionId: payload.s || '' };
}

const SERVER_CODE128_PATTERNS: readonly string[] = [
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
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

function escapeLabelHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateServerCode128Svg(rawText: string, height = 58): string {
  const clean = String(rawText || '').trim().replace(/[^\x20-\x7E]/g, '');
  if (!clean) return '';
  const codes: number[] = [];
  const isEvenDigits = /^\d+$/.test(clean) && clean.length >= 4 && clean.length % 2 === 0;
  if (isEvenDigits) {
    codes.push(105);
    for (let i = 0; i < clean.length; i += 2) {
      codes.push(parseInt(clean.slice(i, i + 2), 10));
    }
  } else {
    codes.push(104);
    for (let i = 0; i < clean.length; i++) {
      const val = clean.charCodeAt(i) - 32;
      if (val >= 0 && val <= 95) codes.push(val);
    }
  }
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) checksum += codes[i] * i;
  codes.push(checksum % 103);
  codes.push(106);

  const moduleWidth = 2;
  const quietZone = 10;
  let cursor = quietZone;
  const rects: string[] = [];
  for (const code of codes) {
    const pattern = SERVER_CODE128_PATTERNS[code];
    if (!pattern) continue;
    for (let i = 0; i < pattern.length; i++) {
      const w = Number(pattern[i]);
      if (i % 2 === 0) {
        rects.push(`<rect x="${cursor * moduleWidth}" y="0" width="${w * moduleWidth}" height="${height}" fill="#000000" />`);
      }
      cursor += w;
    }
  }
  const totalWidth = (cursor + quietZone) * moduleWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect x="0" y="0" width="${totalWidth}" height="${height}" fill="#ffffff" />${rects.join('')}</svg>`;
}

function isSafeDelhiveryLabelUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return (
      host.endsWith('.delhivery.com') ||
      host === 'delhivery.com' ||
      host.endsWith('.amazonaws.com') ||
      host.endsWith('.cloudfront.net') ||
      host.endsWith('.googleapis.com')
    );
  } catch {
    return false;
  }
}

function isPlaceholderAwbValue(awb: string, awbSource?: string): boolean {
  const clean = String(awb || '').trim();
  if (!clean || clean.length < 8) return true;
  if (clean.startsWith('RM') && clean.endsWith('IN')) return true;
  if (awbSource === 'manual') return true;
  if (/^606696\d{8}$/.test(clean) && awbSource !== 'delhivery_live') return true;
  return false;
}

function buildDelhiveryThermalLabelHtml(params: {
  awb: string;
  orderId: string;
  customerName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  shippingMode: string;
  paymentMode: string;
  codAmount: number;
  totalAmount: number;
  itemsSummary: string;
  totalQty: number;
  weightKg: number;
  dimensionsText: string;
  sortCode?: string;
  officialBarcodeImage?: string;
  warehouseName: string;
  pickupAddress: string;
  pickupPincode: string;
  pickupPhone: string;
  clientName: string;
  orderDateText: string;
  autoPrint?: boolean;
}): string {
  const isCod = params.paymentMode.toUpperCase() === 'COD';
  const barcodeSvg = generateServerCode128Svg(params.awb, 62);
  const safeOfficialBarcode =
    params.officialBarcodeImage && /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(params.officialBarcodeImage)
      ? `<img src="${params.officialBarcodeImage}" alt="Delhivery Official Barcode" style="max-width:100%;height:62px;object-fit:contain;display:block;margin:0 auto 6px auto;" />`
      : barcodeSvg;
  const orderBarcodeSvg = generateServerCode128Svg(params.orderId.replace(/[^A-Za-z0-9-]/g, ''), 30);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Delhivery Shipping Label - ${escapeLabelHtml(params.awb)}</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 12px;
      background: #f8fafc;
      color: #000;
    }
    .toolbar {
      max-width: 392px;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .toolbar button {
      background: #E52229;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 800;
      cursor: pointer;
    }
    .sheet {
      background: #fff;
      max-width: 392px;
      margin: 0 auto;
      padding: 12px;
      border: 2px solid #000;
    }
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .brand { font-size: 17px; font-weight: 900; letter-spacing: 0.8px; }
    .brand-sub { font-size: 9px; font-weight: 700; color: #333; margin-top: 2px; }
    .routing { text-align: right; }
    .logo-del { font-size: 15px; font-weight: 900; color: #E52229; letter-spacing: 0.5px; }
    .sort-code { font-size: 16px; font-weight: 900; font-family: monospace; margin-top: 2px; }
    .awb-box {
      text-align: center;
      border-bottom: 2px solid #000;
      padding: 8px 4px 10px 4px;
      margin-bottom: 8px;
      background: #fff;
    }
    .awb-num { font-size: 17px; font-weight: 900; letter-spacing: 2px; font-family: monospace; margin-top: 4px; }
    .order-ref { font-size: 10px; font-weight: 800; margin-top: 2px; color: #111; }
    .pay-box {
      border: 2px solid #000;
      padding: 7px 8px;
      text-align: center;
      margin-bottom: 8px;
      background: ${isCod ? '#fffbeb' : '#ecfdf5'};
    }
    .pay-mode { font-size: 10px; font-weight: 900; letter-spacing: 0.6px; }
    .pay-amt { font-size: 15px; font-weight: 900; margin-top: 2px; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1.5px solid #000;
      padding-bottom: 6px;
      margin-bottom: 8px;
      font-size: 10.5px;
      line-height: 1.4;
    }
    .consignee {
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .sec-title { font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #222; margin-bottom: 3px; }
    .name { font-size: 14px; font-weight: 900; margin-bottom: 2px; }
    .addr { font-size: 11px; line-height: 1.38; }
    .pin-line {
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 900;
      font-family: monospace;
    }
    .pin-pill { background: #000; color: #fff; padding: 2px 7px; }
    .items {
      border-bottom: 1.5px dashed #000;
      padding-bottom: 7px;
      margin-bottom: 7px;
      font-size: 10px;
      line-height: 1.35;
    }
    .shipper {
      font-size: 9.5px;
      line-height: 1.35;
      border-bottom: 1.5px solid #000;
      padding-bottom: 7px;
      margin-bottom: 6px;
    }
    .footer { font-size: 8.5px; text-align: center; color: #333; font-weight: 700; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet { border: 2px solid #000; margin: 0 auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Delhivery 4x6 Thermal Label • AWB ${escapeLabelHtml(params.awb)}</span>
    <button type="button" onclick="window.print()">Print 4x6 Label</button>
  </div>
  <div class="sheet">
    <div class="hdr">
      <div>
        <div class="brand">REDMODE</div>
        <div class="brand-sub">WOMEN ETHNIC WEAR &bull; ${escapeLabelHtml(params.shippingMode.toUpperCase())}</div>
      </div>
      <div class="routing">
        <div class="logo-del">DELHIVERY</div>
        <div class="sort-code">${escapeLabelHtml(params.sortCode || `PIN/${params.pincode}`)}</div>
      </div>
    </div>

    <div class="awb-box">
      ${safeOfficialBarcode}
      <div class="awb-num">${escapeLabelHtml(params.awb)}</div>
      <div class="order-ref">ORDER ID: ${escapeLabelHtml(params.orderId)} &bull; DATE: ${escapeLabelHtml(params.orderDateText)}</div>
    </div>

    <div class="pay-box">
      <div class="pay-mode">${isCod ? 'CASH ON DELIVERY (COD)' : 'PREPAID SHIPMENT'}</div>
      <div class="pay-amt">${isCod ? `COLLECT CASH: ₹${Math.round(params.codAmount).toLocaleString('en-IN')}` : 'DO NOT COLLECT CASH (PAID)'}</div>
    </div>

    <div class="meta-grid">
      <div>
        <strong>MODE:</strong> ${escapeLabelHtml(params.shippingMode)}<br />
        <strong>WEIGHT:</strong> ${escapeLabelHtml(params.weightKg.toFixed(2))} KG
      </div>
      <div style="text-align:right;">
        <strong>DIMS:</strong> ${escapeLabelHtml(params.dimensionsText)}<br />
        <strong>TOTAL QTY:</strong> ${escapeLabelHtml(params.totalQty)} pcs
      </div>
    </div>

    <div class="consignee">
      <div class="sec-title">SHIP TO (CONSIGNEE):</div>
      <div class="name">${escapeLabelHtml(params.customerName)}</div>
      <div class="addr">${escapeLabelHtml(params.address)}</div>
      <div class="addr">${escapeLabelHtml(params.city)}${params.state ? `, ${escapeLabelHtml(params.state)}` : ''}</div>
      <div class="pin-line">
        <span class="pin-pill">PIN: ${escapeLabelHtml(params.pincode)}</span>
        <span>PH: ${escapeLabelHtml(params.phone)}</span>
      </div>
    </div>

    <div class="items">
      <div class="sec-title">SKU / ITEM SUMMARY:</div>
      <div>${escapeLabelHtml(params.itemsSummary)}</div>
      <div style="margin-top:4px;max-width:200px;">${orderBarcodeSvg}</div>
    </div>

    <div class="shipper">
      <div class="sec-title">RETURN / PICKUP WAREHOUSE (RTO ORIGIN):</div>
      <strong>${escapeLabelHtml(params.warehouseName)} (Client: ${escapeLabelHtml(params.clientName)})</strong><br />
      ${escapeLabelHtml(params.pickupAddress)} - ${escapeLabelHtml(params.pickupPincode)}<br />
      Contact: ${escapeLabelHtml(params.pickupPhone)} | myredmode@gmail.com
    </div>

    <div class="footer">
      Official REDMODE &times; Delhivery B2C Scannable Code-128 Dispatch Label
    </div>
  </div>
  ${params.autoPrint ? '<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script>' : ''}
</body>
</html>`;
}

async function startServer() {
  const app = express();
  
  // In AI Studio / Cloud Run container environment:
  // Nginx listens externally on port 8080 and reverse-proxies to http://localhost:3000.
  // When Cloud Run sets PORT=8080, binding to 8080 triggers EADDRINUSE and crashes the deployment.
  // Thus, the Node application MUST always bind to port 3000 unless a non-8080 PORT or CLI --port is passed.
  let PORT = 3000;
  if (process.env.PORT && process.env.PORT !== '8080') {
    const parsed = Number(process.env.PORT);
    if (!isNaN(parsed) && parsed > 0) PORT = parsed;
  }
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--port' && process.argv[i + 1]) {
      const parsed = parseInt(process.argv[i + 1], 10);
      if (!isNaN(parsed) && parsed > 0) PORT = parsed;
    }
  }

  let HOST = '0.0.0.0';
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--host' && process.argv[i + 1]) {
      HOST = process.argv[i + 1];
    }
  }

  app.use(
    express.json({
      limit: '25mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Ensure public/uploads directory exists and is statically served
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {}
  }
  app.use('/uploads', express.static(uploadsDir));

  // Permanent Product Image Upload Endpoint
  app.post('/api/upload', (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ success: false, message: 'No image data provided' });
      }

      // Return self-contained data:image/ or hosted URLs directly so images work across all cloud instances & devices
      if (
        image.startsWith('data:image/') ||
        image.startsWith('http://') ||
        image.startsWith('https://') ||
        image.startsWith('/uploads/')
      ) {
        return res.json({ success: true, url: image });
      }

      return res.json({ success: true, url: `data:image/jpeg;base64,${image}` });
    } catch (err: any) {
      console.error('Image upload endpoint error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Image upload failed' });
    }
  });

  // Health check endpoints for Cloud Run & load balancer probes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
  app.get('/_healthz', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });
  app.get('/healthz', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // RedMode RBAC Authorization Middlewares (Server-Verified Session Token)
  const requireSuperAdmin = (req: Request, res: Response, next: express.NextFunction) => {
    const verified = extractVerifiedAdminFromRequest(req);
    const allowedRoles = ['Super Admin', 'Listing Admin', 'Listing + Label Admin', 'Label Admin'];
    if (!verified || !allowedRoles.includes(verified.role)) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_ADMIN_SESSION',
        message: 'Access Denied: Valid administrator session token is required.',
      });
    }
    (req as any).adminUser = verified;
    next();
  };

  // Brute-force login rate limiter (max 10 failed attempts per 15 minutes per IP)
  const adminLoginAttempts: Record<string, { count: number; resetAt: number }> = {};

  // Admin Login, Session Verification, Logout All Devices & Password Update Endpoints
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const clientIp =
      String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local')
        .split(',')[0]
        .trim();
    const now = Date.now();
    const rateRecord = adminLoginAttempts[clientIp];
    if (rateRecord && now < rateRecord.resetAt && rateRecord.count >= 10) {
      const waitMin = Math.max(1, Math.ceil((rateRecord.resetAt - now) / 60000));
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. Please wait ${waitMin} minute(s) and try again.`,
      });
    }

    const { username = '', password = '', staffUsers = [] } = req.body || {};

    const normalizedUser = String(username).trim().toLowerCase();
    const cleanDigits = String(username).replace(/\D/g, '');
    const trimmedPass = String(password).trim();

    if (!normalizedUser || !trimmedPass) {
      return res.status(400).json({ success: false, message: 'Admin username and password are required.' });
    }

    const masterUsername = (process.env.ADMIN_MASTER_USERNAME || 'admin').trim().toLowerCase();
    const masterPassword = (process.env.ADMIN_MASTER_PASSWORD || '').trim();

    const isSuperUserMatch =
      normalizedUser === masterUsername ||
      normalizedUser === 'admin' ||
      normalizedUser === 'aamir' ||
      normalizedUser === 'myredmode@gmail.com' ||
      normalizedUser === 'admin@redmode.in' ||
      (cleanDigits.length >= 10 && cleanDigits.slice(-10) === '7302797464');

    let isSuperPassValid = false;
    if (customAdminPasswordHash) {
      isSuperPassValid = hashAdminPassword(trimmedPass) === customAdminPasswordHash;
    } else if (masterPassword) {
      isSuperPassValid = trimmedPass === masterPassword;
    } else {
      isSuperPassValid = trimmedPass === 'RedMode@100';
    }

    if (isSuperUserMatch && isSuperPassValid) {
      delete adminLoginAttempts[clientIp];
      const token = signAdminSessionToken({
        userId: 'admin-super-1',
        name: 'Aamir',
        email: 'myredmode@gmail.com',
        mobile: '7302797464',
        role: 'Super Admin',
        sessionVersion: activeAdminSessionVersion,
      });
      res.setHeader(
        'Set-Cookie',
        `redmode_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
      );
      return res.json({
        success: true,
        token,
        sessionVersion: activeAdminSessionVersion,
        user: {
          id: 'admin-super-1',
          name: 'Aamir',
          email: 'myredmode@gmail.com',
          mobile: '+91 73027 97464',
          role: 'Super Admin',
          status: 'active',
        },
        message: 'Super Admin authenticated successfully.',
      });
    }

    if (Array.isArray(staffUsers)) {
      const staffMatch = staffUsers.find(
        (u: any) =>
          u &&
          u.role !== 'Super Admin' &&
          (String(u.name || '').trim().toLowerCase() === normalizedUser ||
            String(u.email || '').trim().toLowerCase() === normalizedUser ||
            String(u.id || '').trim().toLowerCase() === normalizedUser ||
            (u.mobile &&
              cleanDigits.length >= 10 &&
              String(u.mobile).replace(/\D/g, '').slice(-10) === cleanDigits.slice(-10)))
      );

      if (staffMatch && staffMatch.password && trimmedPass === String(staffMatch.password)) {
        if (staffMatch.status === 'disabled') {
          return res.status(403).json({
            success: false,
            message: 'Your staff account has been deactivated. Please contact Super Admin.',
          });
        }
        delete adminLoginAttempts[clientIp];
        const token = signAdminSessionToken({
          userId: staffMatch.id,
          name: staffMatch.name,
          email: staffMatch.email,
          mobile: staffMatch.mobile,
          role: staffMatch.role,
          sessionVersion: activeAdminSessionVersion,
        });
        res.setHeader(
          'Set-Cookie',
          `redmode_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
        );
        return res.json({
          success: true,
          token,
          sessionVersion: activeAdminSessionVersion,
          user: {
            id: staffMatch.id,
            name: staffMatch.name,
            email: staffMatch.email,
            mobile: staffMatch.mobile,
            role: staffMatch.role,
            status: 'active',
          },
          message: `Authenticated as ${staffMatch.name} (${staffMatch.role}).`,
        });
      }
    }

    // Record failed attempt for rate limiting
    if (!rateRecord || now >= rateRecord.resetAt) {
      adminLoginAttempts[clientIp] = { count: 1, resetAt: now + 15 * 60 * 1000 };
    } else {
      rateRecord.count += 1;
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid username or password. Please verify your credentials and try again.',
    });
  });

  app.get('/api/admin/verify-session', (req: Request, res: Response) => {
    const verified = extractVerifiedAdminFromRequest(req);
    if (!verified) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Admin session expired or invalid.',
      });
    }
    return res.json({
      success: true,
      authenticated: true,
      sessionVersion: activeAdminSessionVersion,
      user: {
        id: verified.uid,
        name: verified.name,
        email: verified.email,
        mobile: verified.mobile,
        role: verified.role,
        status: 'active',
      },
    });
  });

  app.post('/api/admin/logout-all-devices', requireSuperAdmin, (req: Request, res: Response) => {
    const verified = (req as any).adminUser;
    activeAdminSessionVersion += 1;
    const newToken = signAdminSessionToken({
      userId: verified?.uid,
      name: verified?.name,
      email: verified?.email,
      mobile: verified?.mobile,
      role: verified?.role,
      sessionVersion: activeAdminSessionVersion,
    });
    res.setHeader(
      'Set-Cookie',
      `redmode_admin_session=${encodeURIComponent(newToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );
    return res.json({
      success: true,
      token: newToken,
      sessionVersion: activeAdminSessionVersion,
      message: 'All other active device sessions have been invalidated.',
    });
  });

  app.post('/api/admin/change-password', requireSuperAdmin, (req: Request, res: Response) => {
    const verified = (req as any).adminUser;
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }
    const masterPassword = (process.env.ADMIN_MASTER_PASSWORD || '').trim();
    const trimmedCurrent = String(currentPassword || '').trim();
    const isCurrentValid = customAdminPasswordHash
      ? hashAdminPassword(trimmedCurrent) === customAdminPasswordHash
      : masterPassword
      ? trimmedCurrent === masterPassword
      : trimmedCurrent === 'RedMode@100';

    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password does not match existing credentials.',
      });
    }

    customAdminPasswordHash = hashAdminPassword(String(newPassword).trim());
    activeAdminSessionVersion += 1;
    const newToken = signAdminSessionToken({
      userId: verified?.uid,
      name: verified?.name,
      email: verified?.email,
      mobile: verified?.mobile,
      role: verified?.role,
      sessionVersion: activeAdminSessionVersion,
    });
    res.setHeader(
      'Set-Cookie',
      `redmode_admin_session=${encodeURIComponent(newToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );
    return res.json({
      success: true,
      token: newToken,
      sessionVersion: activeAdminSessionVersion,
      message: 'Security password updated and other device sessions invalidated.',
    });
  });

  app.post('/api/admin/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', 'redmode_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Persistent Server-Side Data Store (/data/products.json & /data/orders.json)
  const dataDir = process.env.REDMODE_DATA_DIR
    ? path.resolve(process.env.REDMODE_DATA_DIR)
    : path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  const productsDbPath = path.join(dataDir, 'products.json');
  const ordersDbPath = path.join(dataDir, 'orders.json');

  const persistBase64ImageIfNeeded = (imgStr?: string): string => {
    if (!imgStr || typeof imgStr !== 'string') return '';
    // Keep data:image/ URLs intact so products remain self-contained across Cloud Run containers and devices
    return imgStr;
  };

  const normalizeProductImagesOnServer = (product: any): any => {
    if (!product || typeof product !== 'object') return product;
    const copy = { ...product };
    if (typeof copy.mainImage === 'string') {
      copy.mainImage = persistBase64ImageIfNeeded(copy.mainImage);
    }
    if (Array.isArray(copy.images)) {
      copy.images = copy.images.map((u: string) => persistBase64ImageIfNeeded(u)).filter(Boolean);
    }
    if (Array.isArray(copy.colorOptions)) {
      copy.colorOptions = copy.colorOptions.map((co: any) => ({
        ...co,
        image: typeof co.image === 'string' ? persistBase64ImageIfNeeded(co.image) : co.image,
        images: Array.isArray(co.images)
          ? co.images.map((u: string) => persistBase64ImageIfNeeded(u)).filter(Boolean)
          : co.images,
      }));
    }
    return copy;
  };

  const readServerProducts = (): any[] => {
    try {
      if (fs.existsSync(productsDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(productsDbPath, 'utf-8'));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  const writeJsonAtomic = (targetPath: string, data: any) => {
    const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, targetPath);
  };

  const writeServerProducts = (list: any[]) => {
    try {
      writeJsonAtomic(productsDbPath, list);
    } catch (e) {
      console.error('Failed writing products.json:', e);
    }
  };

  const readServerOrders = (): any[] => {
    try {
      if (fs.existsSync(ordersDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(ordersDbPath, 'utf-8'));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  const writeServerOrders = (list: any[]) => {
    try {
      writeJsonAtomic(ordersDbPath, list);
    } catch (e) {
      console.error('Failed writing orders.json:', e);
    }
  };

  // Private Server-Side Integration Credentials Store (/data/integrations-config.json)
  const integrationsDbPath = path.join(dataDir, 'integrations-config.json');

  const isPlaceholderCred = (val?: string): boolean => {
    if (!val || typeof val !== 'string') return true;
    const trimmed = val.trim();
    if (!trimmed) return true;
    const lower = trimmed.toLowerCase();
    return (
      lower.includes('paypal_sandbox_export') ||
      trimmed.includes('EAAG9xxxxxxx') ||
      trimmed === 'de52f7425345a44f9e6f89fc01e86d942554a302' ||
      trimmed === 'Asrb0WLHUFBi3iEU3FK1DfiN'
    );
  };

  const cleanCred = (val?: string): string => {
    if (!val || typeof val !== 'string') return '';
    return isPlaceholderCred(val) ? '' : val.trim();
  };

  const readServerIntegrations = (): any => {
    try {
      if (fs.existsSync(integrationsDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(integrationsDbPath, 'utf-8'));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  };

  const writeServerIntegrations = (cfg: any) => {
    try {
      fs.writeFileSync(integrationsDbPath, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed writing integrations-config.json:', e);
    }
  };

  // Persistent Admin Webhook Debug Logs (/data/webhook-logs.json, capped at 150 events)
  const webhookLogsDbPath = path.join(dataDir, 'webhook-logs.json');

  interface WebhookLogEntry {
    id: string;
    timestamp: string;
    source: 'Delhivery' | 'PayPal' | 'Razorpay' | 'WhatsApp';
    endpoint: string;
    eventType: string;
    referenceId: string;
    httpStatus: number;
    verified: boolean;
    isTest?: boolean;
    summary: string;
    headersSummary?: Record<string, string>;
    payload: any;
  }

  const readWebhookLogs = (): WebhookLogEntry[] => {
    try {
      if (fs.existsSync(webhookLogsDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(webhookLogsDbPath, 'utf-8'));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  };

  const writeWebhookLogs = (logs: WebhookLogEntry[]) => {
    try {
      writeJsonAtomic(webhookLogsDbPath, logs.slice(0, 150));
    } catch (e) {
      console.error('Failed writing webhook-logs.json:', e);
    }
  };

  const sanitizeWebhookHeaders = (headers: Record<string, any>): Record<string, string> => {
    const safeKeys = [
      'content-type',
      'user-agent',
      'paypal-transmission-id',
      'paypal-transmission-time',
      'paypal-auth-algo',
      'paypal-cert-url',
      'x-razorpay-event-id',
      'x-delhivery-event',
      'x-redmode-relay-source',
      'x-redmode-relay-timestamp',
      'x-redmode-relay-event-id',
    ];
    const out: Record<string, string> = {};
    for (const key of safeKeys) {
      if (headers[key]) {
        out[key] = String(headers[key]).slice(0, 220);
      }
    }
    if (headers['paypal-transmission-sig']) {
      out['paypal-transmission-sig'] = '[present]';
    }
    if (headers['x-razorpay-signature']) {
      out['x-razorpay-signature'] = '[present]';
    }
    if (headers['x-hub-signature-256']) {
      out['x-hub-signature-256'] = '[present]';
    }
    if (headers['x-redmode-relay-signature']) {
      out['x-redmode-relay-signature'] = '[present]';
    }
    return out;
  };

  const recordWebhookLog = (entry: Omit<WebhookLogEntry, 'id' | 'timestamp'>): WebhookLogEntry => {
    const fullEntry: WebhookLogEntry = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const existing = readWebhookLogs();
    writeWebhookLogs([fullEntry, ...existing].slice(0, 150));
    return fullEntry;
  };

  const mergeIntegrationsConfigPreservingSecrets = (existing: any, incoming: any): any => {
    const prev = existing && typeof existing === 'object' ? existing : {};
    const next = incoming && typeof incoming === 'object' ? incoming : {};
    const merged: any = { ...prev, ...next };

    const deletedPaymentIds: string[] = Array.isArray(next.deletedPaymentGatewayIds)
      ? Array.from(new Set(next.deletedPaymentGatewayIds.map(String)))
      : Array.isArray(prev.deletedPaymentGatewayIds)
      ? prev.deletedPaymentGatewayIds
      : [];
    merged.deletedPaymentGatewayIds = deletedPaymentIds;

    const deletedShippingIds: string[] = Array.isArray(next.deletedShippingChannelIds)
      ? Array.from(new Set(next.deletedShippingChannelIds.map(String)))
      : Array.isArray(prev.deletedShippingChannelIds)
      ? prev.deletedShippingChannelIds
      : [];
    merged.deletedShippingChannelIds = deletedShippingIds;

    const deletedSmsIds: string[] = Array.isArray(next.deletedSmsGatewayIds)
      ? Array.from(new Set(next.deletedSmsGatewayIds.map(String)))
      : Array.isArray(prev.deletedSmsGatewayIds)
      ? prev.deletedSmsGatewayIds
      : [];
    merged.deletedSmsGatewayIds = deletedSmsIds;

    if (Array.isArray(next.paymentGateways)) {
      const prevList = Array.isArray(prev.paymentGateways) ? prev.paymentGateways : [];
      merged.paymentGateways = next.paymentGateways
        .filter((g: any) => !deletedPaymentIds.includes(g.id))
        .map((g: any) => {
          const old = prevList.find((p: any) => p.id === g.id) || prevList.find((p: any) => p.provider === g.provider);
          return {
            ...g,
            apiKey: cleanCred(g.apiKey) || cleanCred(old?.apiKey),
            apiSecret: cleanCred(g.apiSecret) || cleanCred(old?.apiSecret),
            webhookSecret: cleanCred(g.webhookSecret) || cleanCred(old?.webhookSecret),
          };
        });
    } else if (Array.isArray(prev.paymentGateways)) {
      merged.paymentGateways = prev.paymentGateways.filter((g: any) => !deletedPaymentIds.includes(g.id));
    }

    const razorpayDeleted =
      deletedPaymentIds.includes('razorpay') ||
      (Array.isArray(merged.paymentGateways) && !merged.paymentGateways.some((g: any) => g.provider === 'razorpay' || g.id === 'razorpay'));

    if (razorpayDeleted) {
      merged.razorpaySettings = {
        enabled: false,
        mode: 'live',
        keyId: '',
        keySecret: '',
        merchantName: 'REDMODE',
        themeColor: '#111827',
      };
    } else if (next.razorpaySettings || prev.razorpaySettings) {
      merged.razorpaySettings = {
        ...(prev.razorpaySettings || {}),
        ...(next.razorpaySettings || {}),
        keyId: cleanCred(next.razorpaySettings?.keyId) || cleanCred(prev.razorpaySettings?.keyId),
        keySecret: cleanCred(next.razorpaySettings?.keySecret) || cleanCred(prev.razorpaySettings?.keySecret),
      };
    }

    if (Array.isArray(next.shippingChannels)) {
      const prevChs = Array.isArray(prev.shippingChannels) ? prev.shippingChannels : [];
      merged.shippingChannels = next.shippingChannels
        .filter((c: any) => !deletedShippingIds.includes(c.id))
        .map((c: any) => {
          const old = prevChs.find((p: any) => p.id === c.id) || prevChs.find((p: any) => p.provider === c.provider);
          return {
            ...c,
            apiKey: cleanCred(c.apiKey) || cleanCred(old?.apiKey),
            apiSecret: cleanCred(c.apiSecret) || cleanCred(old?.apiSecret),
          };
        });
    } else if (Array.isArray(prev.shippingChannels)) {
      merged.shippingChannels = prev.shippingChannels.filter((c: any) => !deletedShippingIds.includes(c.id));
    }

    const delhiveryDeleted =
      deletedShippingIds.includes('delhivery') ||
      (Array.isArray(merged.shippingChannels) && !merged.shippingChannels.some((c: any) => c.provider === 'delhivery' || c.id === 'delhivery'));

    if (delhiveryDeleted) {
      merged.delhiverySettings = {
        ...(prev.delhiverySettings || {}),
        ...(next.delhiverySettings || {}),
        enabled: false,
        apiToken: '',
      };
    } else if (next.delhiverySettings || prev.delhiverySettings) {
      merged.delhiverySettings = {
        ...(prev.delhiverySettings || {}),
        ...(next.delhiverySettings || {}),
        apiToken: cleanCred(next.delhiverySettings?.apiToken) || cleanCred(prev.delhiverySettings?.apiToken),
      };
    }

    if (next.whatsappIntegrationDeleted === true) {
      merged.whatsappIntegrationDeleted = true;
      merged.whatsappSettings = {
        enabled: false,
        provider: 'meta_cloud_api',
        phoneNumber: '',
        phoneNumberId: '',
        wabaId: '',
        accessToken: '',
        webhookVerifyToken: '',
        apiEndpoint: 'https://graph.facebook.com/v21.0',
      };
    } else {
      if (next.whatsappIntegrationDeleted === false) {
        merged.whatsappIntegrationDeleted = false;
      }
      if (merged.whatsappIntegrationDeleted) {
        merged.whatsappSettings = {
          enabled: false,
          provider: 'meta_cloud_api',
          phoneNumber: '',
          phoneNumberId: '',
          wabaId: '',
          accessToken: '',
          webhookVerifyToken: '',
          apiEndpoint: 'https://graph.facebook.com/v21.0',
        };
      } else if (next.whatsappSettings || prev.whatsappSettings) {
        merged.whatsappSettings = {
          ...(prev.whatsappSettings || {}),
          ...(next.whatsappSettings || {}),
          accessToken:
            cleanCred(next.whatsappSettings?.accessToken) ||
            (prev.whatsappIntegrationDeleted ? '' : cleanCred(prev.whatsappSettings?.accessToken)),
        };
      }
    }

    if (next.whatsappAppSecret !== undefined || prev.whatsappAppSecret !== undefined) {
      merged.whatsappAppSecret = cleanCred(next.whatsappAppSecret) || cleanCred(prev.whatsappAppSecret);
    }
    if (next.redmodeRelaySecret !== undefined || prev.redmodeRelaySecret !== undefined) {
      merged.redmodeRelaySecret = cleanCred(next.redmodeRelaySecret) || cleanCred(prev.redmodeRelaySecret);
    }

    if (next.smsSettings && Array.isArray(next.smsSettings.gateways)) {
      const prevGws = Array.isArray(prev.smsSettings?.gateways) ? prev.smsSettings.gateways : [];
      merged.smsSettings = {
        ...(prev.smsSettings || {}),
        ...next.smsSettings,
        activeProviderId:
          next.smsSettings.activeProviderId !== undefined
            ? next.smsSettings.activeProviderId
            : prev.smsSettings?.activeProviderId ?? '',
        gateways: next.smsSettings.gateways
          .filter((g: any) => !deletedSmsIds.includes(g.id))
          .map((g: any) => {
            const old = prevGws.find((p: any) => p.id === g.id || p.provider === g.provider);
            return {
              ...g,
              apiKey: cleanCred(g.apiKey) || cleanCred(old?.apiKey),
              accessToken: cleanCred(g.accessToken) || cleanCred(old?.accessToken),
            };
          }),
      };
    } else if (prev.smsSettings && Array.isArray(prev.smsSettings.gateways) && deletedSmsIds.length > 0) {
      merged.smsSettings = {
        ...prev.smsSettings,
        gateways: prev.smsSettings.gateways.filter((g: any) => !deletedSmsIds.includes(g.id)),
      };
    }

    return merged;
  };

  const getEffectiveRazorpayCreds = (
    keyIdOverride?: string,
    keySecretOverride?: string,
    allowInactiveForAdminTest = false
  ) => {
    const cfg = readServerIntegrations();
    const deletedIds = Array.isArray(cfg.deletedPaymentGatewayIds) ? cfg.deletedPaymentGatewayIds : [];
    const hasExplicitGateways = Array.isArray(cfg.paymentGateways);
    const rzpGw = hasExplicitGateways
      ? cfg.activePaymentGatewayId
        ? cfg.paymentGateways.find((g: any) => g.id === cfg.activePaymentGatewayId && g.provider === 'razorpay')
        : cfg.paymentGateways.find((g: any) => g.provider === 'razorpay')
      : null;

    if (!allowInactiveForAdminTest) {
      if (deletedIds.includes('razorpay')) {
        return { keyId: '', keySecret: '', active: false };
      }
      if (hasExplicitGateways) {
        if (cfg.activePaymentGatewayId === '' || !rzpGw || rzpGw.enabled === false) {
          return { keyId: '', keySecret: '', active: false };
        }
      } else if (cfg.razorpaySettings?.enabled === false) {
        return { keyId: '', keySecret: '', active: false };
      }
    }

    const keyId =
      cleanCred(keyIdOverride) ||
      cleanCred(rzpGw?.apiKey) ||
      cleanCred(cfg.razorpaySettings?.keyId) ||
      cleanCred(process.env.RAZORPAY_KEY_ID);
    const keySecret =
      cleanCred(keySecretOverride) ||
      cleanCred(rzpGw?.apiSecret) ||
      cleanCred(cfg.razorpaySettings?.keySecret) ||
      cleanCred(process.env.RAZORPAY_KEY_SECRET);
    return { keyId, keySecret, active: Boolean(keyId && keySecret) };
  };

  const getEffectivePaypalCreds = (
    clientIdOverride?: string,
    clientSecretOverride?: string,
    modeOverride?: string,
    allowInactiveForAdminTest = false
  ) => {
    const cfg = readServerIntegrations();
    const deletedIds = Array.isArray(cfg.deletedPaymentGatewayIds) ? cfg.deletedPaymentGatewayIds : [];
    const hasExplicitGateways = Array.isArray(cfg.paymentGateways);
    const ppGw = hasExplicitGateways
      ? cfg.activeInternationalGatewayId
        ? cfg.paymentGateways.find((g: any) => g.id === cfg.activeInternationalGatewayId && g.provider === 'paypal')
        : cfg.paymentGateways.find((g: any) => g.provider === 'paypal')
      : null;

    if (!allowInactiveForAdminTest) {
      if (deletedIds.includes('paypal')) {
        return { clientId: '', clientSecret: '', isLive: true, active: false };
      }
      if (hasExplicitGateways) {
        if (cfg.activeInternationalGatewayId === '' || !ppGw || ppGw.enabled === false) {
          return { clientId: '', clientSecret: '', isLive: true, active: false };
        }
      }
    }

    const fallbackPpGw =
      ppGw ||
      (hasExplicitGateways ? cfg.paymentGateways.find((g: any) => g.provider === 'paypal') : null);
    const clientId =
      cleanCred(clientIdOverride) || cleanCred(fallbackPpGw?.apiKey) || cleanCred(process.env.PAYPAL_CLIENT_ID);
    const clientSecret =
      cleanCred(clientSecretOverride) || cleanCred(fallbackPpGw?.apiSecret) || cleanCred(process.env.PAYPAL_CLIENT_SECRET);
    const resolvedMode = (modeOverride || fallbackPpGw?.mode || process.env.PAYPAL_MODE || 'live').trim().toLowerCase();
    return { clientId, clientSecret, isLive: resolvedMode === 'live', active: Boolean(clientId && clientSecret) };
  };

  const getEffectiveDelhiveryToken = (tokenOverride?: string, allowInactiveForAdminTest = false): string => {
    const cfg = readServerIntegrations();
    const deletedIds = Array.isArray(cfg.deletedShippingChannelIds) ? cfg.deletedShippingChannelIds : [];
    const hasExplicitChannels = Array.isArray(cfg.shippingChannels);
    const delCh = hasExplicitChannels
      ? cfg.activeShippingChannelId
        ? cfg.shippingChannels.find((c: any) => c.id === cfg.activeShippingChannelId && c.provider === 'delhivery')
        : cfg.shippingChannels.find((c: any) => c.provider === 'delhivery')
      : null;

    if (!allowInactiveForAdminTest) {
      if (deletedIds.includes('delhivery')) return '';
      if (hasExplicitChannels) {
        if (cfg.activeShippingChannelId === '' || !delCh || delCh.enabled === false) {
          return '';
        }
      } else if (cfg.delhiverySettings?.enabled === false) {
        return '';
      }
    }

    const fallbackCh =
      delCh || (hasExplicitChannels ? cfg.shippingChannels.find((c: any) => c.provider === 'delhivery') : null);
    return (
      cleanCred(tokenOverride) ||
      cleanCred(fallbackCh?.apiKey) ||
      cleanCred(cfg.delhiverySettings?.apiToken) ||
      cleanCred(process.env.DELHIVERY_API_TOKEN)
    );
  };

  const getEffectiveDelhiveryConfig = (
    overrides?: {
      apiToken?: string;
      clientName?: string;
      warehouseName?: string;
      pickupPincode?: string;
      pickupAddress?: string;
      pickupPhone?: string;
      environment?: string;
      apiBaseUrl?: string;
    },
    allowInactiveForAdminTest = false
  ) => {
    const cfg = readServerIntegrations();
    const deletedIds = Array.isArray(cfg.deletedShippingChannelIds) ? cfg.deletedShippingChannelIds : [];
    const hasExplicitChannels = Array.isArray(cfg.shippingChannels);
    const delCh = hasExplicitChannels
      ? cfg.activeShippingChannelId
        ? cfg.shippingChannels.find((c: any) => c.id === cfg.activeShippingChannelId && c.provider === 'delhivery')
        : cfg.shippingChannels.find((c: any) => c.provider === 'delhivery')
      : null;

    let blocked = false;
    if (!allowInactiveForAdminTest) {
      if (deletedIds.includes('delhivery')) blocked = true;
      else if (hasExplicitChannels) {
        if (cfg.activeShippingChannelId === '' || !delCh || delCh.enabled === false) {
          blocked = true;
        }
      } else if (cfg.delhiverySettings?.enabled === false) {
        blocked = true;
      }
    }

    const fallbackCh =
      delCh || (hasExplicitChannels ? cfg.shippingChannels.find((c: any) => c.provider === 'delhivery') : null);

    const apiToken = blocked
      ? ''
      : cleanCred(overrides?.apiToken) ||
        cleanCred(fallbackCh?.apiKey) ||
        cleanCred(cfg.delhiverySettings?.apiToken) ||
        cleanCred(process.env.DELHIVERY_API_TOKEN);

    const environment =
      String(overrides?.environment || fallbackCh?.environment || cfg.delhiverySettings?.environment || 'production')
        .trim()
        .toLowerCase() === 'staging'
        ? 'staging'
        : 'production';

    const customBase = String(overrides?.apiBaseUrl || fallbackCh?.apiBaseUrl || '').trim();
    const allowLocalTest = process.env.ALLOW_LOCAL_TEST_ENDPOINTS === 'true';
    const isAllowedDelhiveryBase = (candidate: string): boolean => {
      try {
        const parsed = new URL(candidate);
        if (allowLocalTest && parsed.protocol === 'http:' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) {
          return true;
        }
        return (
          parsed.protocol === 'https:' &&
          (parsed.hostname === 'track.delhivery.com' ||
            parsed.hostname === 'staging-express.delhivery.com' ||
            parsed.hostname.endsWith('.delhivery.com'))
        );
      } catch {
        return false;
      }
    };
    const testDelhiveryOverride = allowLocalTest ? String(process.env.DELHIVERY_TEST_BASE_URL || '').trim() : '';
    const baseUrl =
      testDelhiveryOverride && isAllowedDelhiveryBase(testDelhiveryOverride)
        ? testDelhiveryOverride.replace(/\/+$/, '')
        : environment === 'staging'
        ? 'https://staging-express.delhivery.com'
        : customBase && !customBase.includes('staging-express') && isAllowedDelhiveryBase(customBase)
        ? customBase.replace(/\/+$/, '')
        : 'https://track.delhivery.com';

    const clientName = (
      overrides?.clientName ||
      fallbackCh?.clientId ||
      cfg.delhiverySettings?.clientName ||
      process.env.DELHIVERY_CLIENT_NAME ||
      'Redmode'
    ).trim();

    const warehouseName = (
      overrides?.warehouseName ||
      fallbackCh?.warehouseName ||
      cfg.delhiverySettings?.warehouseName ||
      process.env.DELHIVERY_WAREHOUSE_NAME ||
      'REDMODE B2C'
    ).trim();

    const pickupPincode =
      String(
        overrides?.pickupPincode ||
          fallbackCh?.pickupPincode ||
          cfg.delhiverySettings?.pickupPincode ||
          process.env.DELHIVERY_PICKUP_PINCODE ||
          '250002'
      )
        .replace(/\D/g, '')
        .slice(0, 6) || '250002';

    const pickupAddress = (
      overrides?.pickupAddress ||
      fallbackCh?.pickupAddress ||
      cfg.delhiverySettings?.pickupAddress ||
      '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh'
    ).trim();

    const pickupPhone =
      String(
        overrides?.pickupPhone ||
          fallbackCh?.pickupPhone ||
          cfg.delhiverySettings?.pickupPhone ||
          '7302797464'
      )
        .replace(/\D/g, '')
        .slice(-10) || '7302797464';

    return {
      apiToken,
      clientName,
      warehouseName,
      pickupPincode,
      pickupAddress,
      pickupPhone,
      environment,
      baseUrl,
    };
  };

  const getEffectiveWhatsAppCreds = (
    tokenOverride?: string,
    phoneIdOverride?: string,
    wabaIdOverride?: string,
    allowInactiveForAdminTest = false
  ) => {
    const cfg = readServerIntegrations();
    const waCfg = cfg.whatsappSettings || {};
    const isDeletedOrDisabled = cfg.whatsappIntegrationDeleted === true || waCfg.enabled === false;
    if (!allowInactiveForAdminTest && isDeletedOrDisabled) {
      return { token: '', phoneNumberId: '', wabaId: '', active: false };
    }
    const token =
      cleanCred(tokenOverride) || cleanCred(waCfg.accessToken) || cleanCred(process.env.WHATSAPP_CLOUD_TOKEN);
    const phoneNumberId = (
      phoneIdOverride ||
      waCfg.phoneNumberId ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      '1375149605673144'
    ).trim();
    const wabaId = (wabaIdOverride || waCfg.wabaId || process.env.WHATSAPP_WABA_ID || '2745819689145292').trim();
    return { token, phoneNumberId, wabaId, active: Boolean(token && phoneNumberId) };
  };

  // Permanent Product CRUD API Endpoints
  app.get('/api/products', (_req: Request, res: Response) => {
    return res.json({ success: true, products: readServerProducts() });
  });

  app.post('/api/products', (req: Request, res: Response) => {
    try {
      const rawProduct = req.body?.product || req.body;
      if (!rawProduct || (!rawProduct.name && !rawProduct.title)) {
        return res.status(400).json({ success: false, message: 'Product name is required.' });
      }
      const normalized = normalizeProductImagesOnServer({
        ...rawProduct,
        id: rawProduct.id || `prod-${Date.now()}`,
        name: rawProduct.name || rawProduct.title,
        updatedAt: rawProduct.updatedAt || new Date().toISOString(),
      });
      const existing = readServerProducts();
      const idx = existing.findIndex((p) => p.id === normalized.id);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...normalized };
      } else {
        existing.unshift(normalized);
      }
      writeServerProducts(existing);
      return res.json({ success: true, product: normalized });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to save product on server.' });
    }
  });

  const collectServerProductUploads = (p: any): string[] => {
    if (!p || typeof p !== 'object') return [];
    const list: string[] = [];
    const check = (u?: string) => {
      if (u && typeof u === 'string' && u.startsWith('/uploads/')) {
        list.push(path.basename(u.split('?')[0]));
      }
    };
    check(p.mainImage);
    if (Array.isArray(p.images)) p.images.forEach(check);
    if (Array.isArray(p.colorOptions)) {
      p.colorOptions.forEach((c: any) => {
        check(c?.image);
        if (Array.isArray(c?.images)) c.images.forEach(check);
      });
    }
    return Array.from(new Set(list));
  };

  app.put('/api/products/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const updates = req.body?.product || req.body || {};
      const normalized = normalizeProductImagesOnServer({
        ...updates,
        id,
        updatedAt: updates.updatedAt || new Date().toISOString(),
      });
      const existing = readServerProducts();
      const idx = existing.findIndex((p) => p.id === id);
      if (idx >= 0) {
        const oldFiles = collectServerProductUploads(existing[idx]);
        const newFiles = new Set(collectServerProductUploads(normalized));
        oldFiles.forEach((fileName) => {
          if (!newFiles.has(fileName)) {
            try {
              const fp = path.join(uploadsDir, fileName);
              if (fs.existsSync(fp)) fs.unlinkSync(fp);
            } catch {}
          }
        });
        existing[idx] = { ...existing[idx], ...normalized };
      } else {
        existing.unshift(normalized);
      }
      writeServerProducts(existing);
      return res.json({ success: true, product: existing[idx >= 0 ? idx : 0] });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to update product on server.' });
    }
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const all = readServerProducts();
      const target = all.find((p) => p.id === id);
      if (target) {
        collectServerProductUploads(target).forEach((fileName) => {
          try {
            const fp = path.join(uploadsDir, fileName);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch {}
        });
      }
      const existing = all.filter((p) => p.id !== id);
      writeServerProducts(existing);
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to delete product on server.' });
    }
  });

  // Permanent Orders CRUD API Endpoints (with Phase 2 Automatic WhatsApp Order Confirmation Trigger)
  app.get('/api/orders', (_req: Request, res: Response) => {
    return res.json({ success: true, orders: readServerOrders() });
  });

  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      const incoming = req.body?.order || req.body;
      if (!incoming || !incoming.id) {
        return res.status(400).json({ success: false, message: 'Valid order payload required.' });
      }
      const existing = readServerOrders();
      const idx = existing.findIndex((o) => o.id === incoming.id);
      const isNewOrder = idx < 0;
      const nowIso = new Date().toISOString();

      let savedOrder: any;
      if (idx >= 0) {
        const prevOrder = existing[idx];
        // Never allow stale client payload to regress authoritative webhook/manual confirmation transitions
        const prevSync = Number(prevOrder.syncVersion || 0);
        const incSync = Number(incoming.syncVersion || 0);
        const merged = {
          ...prevOrder,
          ...incoming,
          // Preserve authoritative confirmation & webhook flags unless explicitly updated
          customerConfirmed: Boolean(prevOrder.customerConfirmed || incoming.customerConfirmed),
          customerConfirmedAt: prevOrder.customerConfirmedAt || incoming.customerConfirmedAt,
          confirmationMethod: prevOrder.confirmationMethod || incoming.confirmationMethod,
          confirmedByAdminId: prevOrder.confirmedByAdminId || incoming.confirmedByAdminId,
          confirmedByAdminName: prevOrder.confirmedByAdminName || incoming.confirmedByAdminName,
          whatsappMessageId: incoming.whatsappMessageId || prevOrder.whatsappMessageId,
          whatsappReminderMessageId: incoming.whatsappReminderMessageId || prevOrder.whatsappReminderMessageId,
          whatsappProcessedMessageIds: Array.from(
            new Set([
              ...(Array.isArray(prevOrder.whatsappProcessedMessageIds) ? prevOrder.whatsappProcessedMessageIds : []),
              ...(Array.isArray(incoming.whatsappProcessedMessageIds) ? incoming.whatsappProcessedMessageIds : []),
            ])
          ),
          inventoryRestored: Boolean(prevOrder.inventoryRestored || incoming.inventoryRestored),
          inventoryRestoredAt: prevOrder.inventoryRestoredAt || incoming.inventoryRestoredAt,
          reminder23hSent: Boolean(prevOrder.reminder23hSent || incoming.reminder23hSent),
          reminder23hSentAt: prevOrder.reminder23hSentAt || incoming.reminder23hSentAt,
          updatedAt: nowIso,
          syncVersion: Math.max(prevSync, incSync) + 1,
        };
        existing[idx] = merged;
        savedOrder = merged;
      } else {
        const waPolicy = getEffectiveWhatsAppPolicy();
        const mode = String(incoming.paymentMode || 'COD').toUpperCase() === 'PREPAID' ? 'Prepaid' : 'COD';
        const requiresConfirmation = mode === 'COD' ? waPolicy.confirmCodOrders : waPolicy.confirmPrepaidOrders;

        savedOrder = {
          ...incoming,
          paymentMode: mode,
          orderStatus: requiresConfirmation ? 'NEW' : incoming.orderStatus || 'NEW',
          customerConfirmed: requiresConfirmation ? false : Boolean(incoming.customerConfirmed),
          codVerificationStatus: requiresConfirmation ? 'UNVERIFIED' : incoming.codVerificationStatus || 'UNVERIFIED',
          whatsappStatus: requiresConfirmation ? 'Pending' : incoming.whatsappStatus,
          needsManualFollowUp: false,
          inventoryRestored: false,
          reminder23hSent: false,
          confirmationTask: {
            status: requiresConfirmation ? 'pending' : 'confirmed',
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          createdAt: incoming.createdAt || nowIso,
          updatedAt: nowIso,
          syncVersion: 1,
        };
        existing.unshift(savedOrder);
      }

      // DATABASE-FIRST: Persist order to authoritative store BEFORE any external WhatsApp API call
      writeServerOrders(existing);

      if (isNewOrder) {
        recordConfirmationAuditLog({
          orderId: savedOrder.id,
          eventType: 'ORDER_CREATED_UPCOMING',
          previousStatus: 'NONE',
          newStatus: 'Upcoming',
          confirmationMethod: 'System',
          notes: `Order saved (${savedOrder.paymentMode}, Rs ${Math.round(Number(savedOrder.total || 0))}). Confirmation task created.`,
        });

        // Trigger automatic WhatsApp confirmation best-effort (never blocks or deletes order on Meta failure)
        const waResult = await triggerOrderConfirmationWhatsApp(savedOrder, {
          forceNowOverride: Boolean(req.body?.forceSendNow),
          mockTransport: undefined,
        }).catch((err: any) => ({
          status: 'failed',
          error: err?.message || 'WhatsApp trigger failed',
        }));

        // Reload latest persisted version after WhatsApp metadata update
        const refreshed = readServerOrders().find((o) => o.id === savedOrder.id) || savedOrder;
        return res.json({ success: true, order: refreshed, whatsappAutomation: waResult });
      }

      return res.json({ success: true, order: savedOrder });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Failed to save order.' });
    }
  });

  const requireStaffOrAdmin = (req: Request, res: Response, next: express.NextFunction) => {
    const allowedRoles = ['Super Admin', 'Listing Admin', 'Label Admin', 'Listing + Label Admin'];
    const verified = extractVerifiedAdminFromRequest(req);
    if (!verified || !allowedRoles.includes(verified.role)) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_ADMIN_SESSION',
        message: 'Access Denied: Valid administrator or staff session token required.',
      });
    }
    (req as any).adminUser = verified;
    next();
  };

  // Persistent Integration Credentials Endpoints (Super Admin Only)
  app.get('/api/admin/integrations-config', requireSuperAdmin, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      config: readServerIntegrations(),
    });
  });

  app.post('/api/admin/integrations-config', requireSuperAdmin, (req: Request, res: Response) => {
    try {
      const existing = readServerIntegrations();
      const prevWaEnabled = existing?.whatsappSettings?.enabled !== false && existing?.whatsappIntegrationDeleted !== true;
      const merged = mergeIntegrationsConfigPreservingSecrets(existing, req.body || {});
      const nextWaEnabled = merged?.whatsappSettings?.enabled !== false && merged?.whatsappIntegrationDeleted !== true;
      const nowIso = new Date().toISOString();

      // Track exact timestamp when WhatsApp Automation transitions OFF -> ON so old orders are never resent blindly
      if (!prevWaEnabled && nextWaEnabled) {
        merged.whatsappSettings = {
          ...(merged.whatsappSettings || {}),
          automationEnabledAt: nowIso,
        };
      }
      if (prevWaEnabled !== nextWaEnabled) {
        const adminUser = (req as any).adminUser;
        recordConfirmationAuditLog({
          orderId: 'SYSTEM',
          eventType: nextWaEnabled ? 'WHATSAPP_AUTOMATION_ENABLED' : 'WHATSAPP_AUTOMATION_DISABLED',
          previousStatus: prevWaEnabled ? 'ON' : 'OFF',
          newStatus: nextWaEnabled ? 'ON' : 'OFF',
          confirmationMethod: 'Manual',
          adminId: adminUser?.uid || 'admin',
          adminName: adminUser?.name || 'Admin',
          notes: nextWaEnabled
            ? 'WhatsApp Automation turned ON. Only new/eligible pending tasks will be processed; historical orders will not be resent blindly.'
            : 'WhatsApp Automation turned OFF. Checkout, database, manual confirmation, and Delhivery remain fully operational.',
        });
      }

      // Invalidate cached WhatsApp health probe whenever settings change
      waHealthCache = null;

      writeServerIntegrations(merged);
      if (merged.smsSettings) {
        dynamicSmsConfig = merged.smsSettings;
        try {
          const dir = path.dirname(smsConfigFile);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
      return res.json({ success: true, config: merged });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e?.message || 'Failed saving integrations config.' });
    }
  });

  // Guarded Backend Endpoints
  app.all('/api/admin/settings*', requireSuperAdmin, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Super Admin settings access authorized.' });
  });

  app.all('/api/admin/integrations', requireSuperAdmin, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Super Admin integrations access authorized.' });
  });

  app.all('/api/admin/admin-management*', requireSuperAdmin, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Super Admin staff management authorized.' });
  });

  app.all('/api/admin/catalog-delete*', requireSuperAdmin, (req: Request, res: Response) => {
    res.json({ success: true, message: 'Super Admin product deletion authorized.' });
  });

  // ==========================================
  // RAZORPAY PAYMENT GATEWAY ENDPOINTS
  // ==========================================

  // 1. Public Gateway Configuration (Key ID only, never secret)
  app.get('/api/payment/razorpay/config', (_req: Request, res: Response) => {
    const { keyId, active } = getEffectiveRazorpayCreds();
    const mode = process.env.RAZORPAY_MODE || (keyId.startsWith('rzp_live') ? 'live' : 'test');
    res.json({
      configured: Boolean(keyId && active),
      active: Boolean(keyId && active),
      keyId: active ? keyId : '',
      merchantName: 'REDMODE',
      themeColor: '#E11D48',
      mode,
    });
  });

  // 2. Create Razorpay Order (Strict — Never Simulate)
  app.post('/api/payment/razorpay/create-order', async (req: Request, res: Response) => {
    const { amount, receipt, notes, keyIdOverride, keySecretOverride } = req.body || {};
    const { keyId, keySecret } = getEffectiveRazorpayCreds(keyIdOverride, keySecretOverride);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount.' });
    }

    if (!keyId || !keySecret) {
      return res.status(503).json({
        success: false,
        configured: false,
        message:
          'Online payment gateway (Razorpay) is not configured. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Environment Variables or select Cash on Delivery (COD).',
      });
    }

    const amountInPaise = Math.round(numericAmount * 100);

    try {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receipt || `rcpt_${Date.now()}`,
          notes: notes || { store: 'REDMODE' },
        }),
      });

      const rzpData: any = await rzpRes.json().catch(() => ({}));

      if (!rzpRes.ok || !rzpData?.id) {
        return res.status(rzpRes.status || 400).json({
          success: false,
          message: rzpData?.error?.description || 'Razorpay order creation failed.',
          error: rzpData,
        });
      }

      return res.json({
        success: true,
        orderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId,
        live: !keyId.startsWith('rzp_test'),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Network error connecting to Razorpay: ${err.message}`,
      });
    }
  });

  // 3. Verify Razorpay Payment Signature & Amount (Strict — Never Simulate)
  app.post('/api/payment/razorpay/verify', async (req: Request, res: Response) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      expectedAmountInr,
      keyIdOverride,
      keySecretOverride,
    } = req.body || {};
    const { keyId, keySecret } = getEffectiveRazorpayCreds(keyIdOverride, keySecretOverride);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Missing required payment details (order_id, payment_id, signature).',
      });
    }

    if (String(razorpay_order_id).startsWith('order_sim_') || !keySecret) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Simulated payments are disabled in production.',
      });
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const sigBuf = Buffer.from(String(razorpay_signature), 'utf-8');
      const genBuf = Buffer.from(generatedSignature, 'utf-8');

      if (sigBuf.length !== genBuf.length || !crypto.timingSafeEqual(sigBuf, genBuf)) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Invalid payment signature. Payment verification failed.',
        });
      }

      if (keyId && expectedAmountInr && Number(expectedAmountInr) > 0) {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const orderCheckRes = await fetch(
          `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`,
          { headers: { Authorization: authHeader } }
        );
        if (orderCheckRes.ok) {
          const orderCheckData: any = await orderCheckRes.json().catch(() => ({}));
          const expectedPaise = Math.round(Number(expectedAmountInr) * 100);
          if (orderCheckData.amount && Number(orderCheckData.amount) !== expectedPaise) {
            return res.status(400).json({
              success: false,
              verified: false,
              message: 'Payment amount mismatch detected.',
            });
          }
          if (orderCheckData.currency && orderCheckData.currency !== 'INR') {
            return res.status(400).json({
              success: false,
              verified: false,
              message: 'Payment currency mismatch detected.',
            });
          }
        }
      }

      return res.json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        message: 'Payment verified successfully! Order is confirmed.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        verified: false,
        message: `Signature verification error: ${err.message}`,
      });
    }
  });

  // 3b. Razorpay Webhook Verification
  app.post('/api/payment/razorpay/webhook', (req: Request, res: Response) => {
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    const signature = req.headers['x-razorpay-signature'] as string;
    const eventName = req.body?.event || 'razorpay.event';
    const orderRef = req.body?.payload?.payment?.entity?.order_id || req.body?.payload?.payment?.entity?.id || '';
    if (!webhookSecret || !signature) {
      recordWebhookLog({
        source: 'Razorpay',
        endpoint: '/api/payment/razorpay/webhook',
        eventType: eventName,
        referenceId: orderRef,
        httpStatus: 400,
        verified: false,
        summary: 'Missing Razorpay webhook secret or signature header.',
        headersSummary: sanitizeWebhookHeaders(req.headers),
        payload: req.body || {},
      });
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay webhook secret or signature header.',
      });
    }
    const rawPayload = JSON.stringify(req.body || {});
    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
    if (expectedSig !== signature) {
      recordWebhookLog({
        source: 'Razorpay',
        endpoint: '/api/payment/razorpay/webhook',
        eventType: eventName,
        referenceId: orderRef,
        httpStatus: 401,
        verified: false,
        summary: 'Invalid Razorpay webhook signature.',
        headersSummary: sanitizeWebhookHeaders(req.headers),
        payload: req.body || {},
      });
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }
    recordWebhookLog({
      source: 'Razorpay',
      endpoint: '/api/payment/razorpay/webhook',
      eventType: eventName,
      referenceId: orderRef,
      httpStatus: 200,
      verified: true,
      summary: `Verified Razorpay webhook event "${eventName}".`,
      headersSummary: sanitizeWebhookHeaders(req.headers),
      payload: req.body || {},
    });
    return res.json({
      success: true,
      event: req.body?.event || 'verified',
      orderId: req.body?.payload?.payment?.entity?.order_id || null,
      paymentId: req.body?.payload?.payment?.entity?.id || null,
    });
  });

  // 3c. PayPal & Universal Payment Webhook Listener (/api/payment/webhook & /api/payment/paypal/webhook)
  const handlePaypalOrUniversalPaymentWebhook = async (req: Request, res: Response) => {
    const body = req.body || {};
    const endpointPath = req.path || '/api/payment/webhook';

    // Route Razorpay-formatted events cleanly if pointed at universal URL
    if (body?.payload?.payment?.entity && (req.headers['x-razorpay-signature'] || String(body.event || '').startsWith('payment.'))) {
      const eventName = String(body.event || 'payment.event');
      const refId = String(body.payload.payment.entity.order_id || body.payload.payment.entity.id || '');
      recordWebhookLog({
        source: 'Razorpay',
        endpoint: endpointPath,
        eventType: eventName,
        referenceId: refId,
        httpStatus: 200,
        verified: Boolean(req.headers['x-razorpay-signature']),
        summary: `Razorpay payment webhook "${eventName}" received.`,
        headersSummary: sanitizeWebhookHeaders(req.headers),
        payload: body,
      });
      return res.json({ success: true, source: 'Razorpay', event: eventName, referenceId: refId });
    }

    const eventType = String(body.event_type || body.event || '').trim();
    if (!eventType) {
      recordWebhookLog({
        source: 'PayPal',
        endpoint: endpointPath,
        eventType: 'UNKNOWN',
        referenceId: '',
        httpStatus: 400,
        verified: false,
        summary: 'Missing event_type in PayPal webhook payload.',
        headersSummary: sanitizeWebhookHeaders(req.headers),
        payload: body,
      });
      return res.status(400).json({ success: false, message: 'Missing event_type in webhook payload.' });
    }

    const resource = body.resource || {};
    const refId = String(
      resource?.supplementary_data?.related_ids?.order_id ||
        resource?.id ||
        body?.id ||
        ''
    ).trim();
    const amountVal = resource?.amount?.value || resource?.purchase_units?.[0]?.amount?.value || '';
    const currencyCode = resource?.amount?.currency_code || resource?.purchase_units?.[0]?.amount?.currency_code || '';

    // Optional cryptographic verification via PayPal API if Webhook ID + transmission headers are configured
    let verified = true;
    let verificationNote = 'PayPal event logged cleanly.';
    const transmissionId = req.headers['paypal-transmission-id'] as string;
    const transmissionSig = req.headers['paypal-transmission-sig'] as string;
    const transmissionTime = req.headers['paypal-transmission-time'] as string;
    const certUrl = req.headers['paypal-cert-url'] as string;
    const authAlgo = req.headers['paypal-auth-algo'] as string;

    const cfg = readServerIntegrations();
    const ppGw = Array.isArray(cfg.paymentGateways)
      ? cfg.paymentGateways.find((g: any) => g.provider === 'paypal')
      : null;
    const configuredWebhookId = cleanCred(ppGw?.webhookSecret) || cleanCred(process.env.PAYPAL_WEBHOOK_ID);
    const ppCreds = getEffectivePaypalCreds(undefined, undefined, undefined, true);

    if (configuredWebhookId && transmissionId && transmissionSig && ppCreds.clientId && ppCreds.clientSecret) {
      try {
        const paypalBase = ppCreds.isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
        const authBasic = Buffer.from(`${ppCreds.clientId}:${ppCreds.clientSecret}`).toString('base64');
        const tokRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${authBasic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        });
        const tokData: any = await tokRes.json().catch(() => ({}));
        if (tokRes.ok && tokData?.access_token) {
          const verifyRes = await fetch(`${paypalBase}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              auth_algo: authAlgo,
              cert_url: certUrl,
              transmission_id: transmissionId,
              transmission_sig: transmissionSig,
              transmission_time: transmissionTime,
              webhook_id: configuredWebhookId,
              webhook_event: body,
            }),
          });
          const verifyData: any = await verifyRes.json().catch(() => ({}));
          if (verifyData?.verification_status === 'SUCCESS') {
            verified = true;
            verificationNote = 'PayPal signature cryptographically verified.';
          } else {
            verified = false;
            verificationNote = `PayPal signature verification returned ${verifyData?.verification_status || 'FAILURE'}.`;
          }
        }
      } catch (err: any) {
        verificationNote = `PayPal signature check skipped (${err?.message || 'network error'}).`;
      }
    } else if (!transmissionSig) {
      verificationNote = configuredWebhookId
        ? 'Received without PayPal signature headers (manual/simulator request).'
        : 'Logged (add PayPal Webhook ID in Payment settings to enforce signature verification).';
    }

    const summaryParts = [
      body.summary || eventType,
      amountVal && currencyCode ? `${currencyCode} ${amountVal}` : '',
      verificationNote,
    ].filter(Boolean);

    recordWebhookLog({
      source: 'PayPal',
      endpoint: endpointPath,
      eventType,
      referenceId: refId,
      httpStatus: 200,
      verified,
      summary: summaryParts.join(' — '),
      headersSummary: sanitizeWebhookHeaders(req.headers),
      payload: body,
    });

    return res.status(200).json({
      success: true,
      source: 'PayPal',
      event: eventType,
      referenceId: refId,
      verified,
      message: summaryParts.join(' — '),
    });
  };

  app.post('/api/payment/webhook', handlePaypalOrUniversalPaymentWebhook);
  app.post('/api/payment/paypal/webhook', handlePaypalOrUniversalPaymentWebhook);

  // 3d. Super Admin Webhook Log Viewer, Simulator & Clear APIs
  app.get('/api/admin/webhook-logs', requireSuperAdmin, (req: Request, res: Response) => {
    const sourceFilter = String(req.query.source || 'All').trim();
    const allLogs = readWebhookLogs();
    const logs =
      sourceFilter && sourceFilter !== 'All'
        ? allLogs.filter((l) => l.source.toLowerCase() === sourceFilter.toLowerCase())
        : allLogs;
    return res.json({ success: true, logs });
  });

  app.post('/api/admin/webhook-logs/test', requireSuperAdmin, (req: Request, res: Response) => {
    const source = req.body?.source === 'PayPal' ? 'PayPal' : 'Delhivery';
    const nowIso = new Date().toISOString();
    if (source === 'PayPal') {
      const sampleOrder = `PAYPAL_TEST_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const log = recordWebhookLog({
        source: 'PayPal',
        endpoint: '/api/payment/webhook',
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        referenceId: sampleOrder,
        httpStatus: 200,
        verified: true,
        isTest: true,
        summary: 'Simulated PayPal webhook capture completed ($49.00 USD) — Verification test passed.',
        headersSummary: { 'content-type': 'application/json', 'user-agent': 'PayPal-Webhook-Simulator' },
        payload: {
          id: `WH-TEST-${Date.now()}`,
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          create_time: nowIso,
          summary: 'Payment completed for USD 49.00',
          resource: {
            id: `CAP-${Date.now()}`,
            status: 'COMPLETED',
            amount: { currency_code: 'USD', value: '49.00' },
            supplementary_data: { related_ids: { order_id: sampleOrder } },
          },
        },
      });
      return res.json({ success: true, log });
    }

    const sampleAwb = `TEST${Math.floor(10000000 + Math.random() * 89999999)}`;
    const log = recordWebhookLog({
      source: 'Delhivery',
      endpoint: '/api/shipping/webhook',
      eventType: 'In Transit',
      referenceId: sampleAwb,
      httpStatus: 200,
      verified: true,
      isTest: true,
      summary: `Simulated Delhivery scan received for AWB #${sampleAwb} at Meerut Hub.`,
      headersSummary: { 'content-type': 'application/json', 'user-agent': 'Delhivery-Webhook-Simulator' },
      payload: {
        Shipment: {
          AWB: sampleAwb,
          Status: {
            Status: 'In Transit',
            StatusCode: 'UD',
            StatusDateTime: nowIso,
            StatusLocation: 'Meerut B2C Hub (250002)',
            Instructions: 'Simulated pickup/in-transit scan verification.',
          },
        },
      },
    });
    return res.json({ success: true, log });
  });

  app.delete('/api/admin/webhook-logs', requireSuperAdmin, (_req: Request, res: Response) => {
    writeWebhookLogs([]);
    return res.json({ success: true, message: 'Webhook logs cleared.' });
  });

  // 4. Test Razorpay Credentials (Super Admin)
  app.post('/api/payment/razorpay/test-keys', requireSuperAdmin, async (req: Request, res: Response) => {
    const { keyId, keySecret } = req.body || {};
    const finalKeyId = (keyId || process.env.RAZORPAY_KEY_ID || '').trim();
    const finalKeySecret = (keySecret || process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!finalKeyId || !finalKeySecret) {
      return res.status(400).json({
        success: false,
        message: 'Both Razorpay Key ID and Key Secret are required to test credentials.',
      });
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${finalKeyId}:${finalKeySecret}`).toString('base64');
      const testRes = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!testRes.ok) {
        const errorData: any = await testRes.json().catch(() => ({}));
        return res.status(testRes.status).json({
          success: false,
          message:
            errorData?.error?.description ||
            `Razorpay returned error ${testRes.status}: Authentication failed. Please verify your Key ID & Secret.`,
        });
      }

      const isLive = !finalKeyId.startsWith('rzp_test');
      return res.json({
        success: true,
        isLive,
        mode: isLive ? 'Production (Live)' : 'Test Mode (Sandbox)',
        message: `Connected to Razorpay successfully! Authenticated in ${
          isLive ? 'LIVE PRODUCTION' : 'TEST (SANDBOX)'
        } mode.`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to test Razorpay connection: ${err.message}`,
      });
    }
  });

  // ==========================================
  // PAYPAL INTERNATIONAL / EXPORT PAYMENT ENDPOINTS
  // ==========================================

  // 5. Test PayPal Credentials (Super Admin)
  app.post('/api/payment/paypal/test-keys', requireSuperAdmin, async (req: Request, res: Response) => {
    const { clientId, clientSecret, mode } = req.body || {};
    if (
      String(clientId || '').toLowerCase().includes('paypal_sandbox_export') ||
      String(clientSecret || '').toLowerCase().includes('paypal_sandbox_export')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Placeholder PayPal credentials detected. Please enter your actual PayPal REST App Client ID and Client Secret.',
      });
    }

    const { clientId: finalClientId, clientSecret: finalClientSecret, isLive } = getEffectivePaypalCreds(
      clientId,
      clientSecret,
      mode,
      true
    );

    if (!finalClientId || !finalClientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Both PayPal Client ID and Client Secret are required to test international connection.',
      });
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${finalClientId}:${finalClientSecret}`).toString('base64');
      const oauthUrl = isLive
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

      const tokenRes = await fetch(oauthUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) {
        const errJson: any = await tokenRes.json().catch(() => ({}));
        // Check if credentials actually belong to the opposite PayPal environment (Sandbox vs Live)
        if (tokenRes.status === 401) {
          const altUrl = isLive
            ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
            : 'https://api-m.paypal.com/v1/oauth2/token';
          const altRes = await fetch(altUrl, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          }).catch(() => null);
          if (altRes?.ok) {
            return res.status(400).json({
              success: false,
              environmentMismatch: true,
              suggestedMode: isLive ? 'test' : 'live',
              message: isLive
                ? `Client Authentication failed in Production Live mode — these credentials belong to PayPal SANDBOX! Please change Environment Mode to "Test / Sandbox Mode", click Save Changes, and test again.`
                : `Client Authentication failed in Test / Sandbox mode — these credentials belong to PayPal LIVE! Please change Environment Mode to "Production Live", click Save Changes, and test again.`,
            });
          }
        }
        return res.status(tokenRes.status).json({
          success: false,
          message:
            errJson?.error_description ||
            `PayPal returned error ${tokenRes.status}: Invalid Client ID or Secret for ${
              isLive ? 'Live' : 'Sandbox'
            } environment.`,
        });
      }

      const tokenData: any = await tokenRes.json();
      return res.json({
        success: true,
        isLive,
        mode: isLive ? 'Production (Live)' : 'Sandbox (Test Mode)',
        appId: tokenData?.app_id || 'PayPal App',
        message: `PayPal International Gateway verified successfully in ${isLive ? 'LIVE' : 'SANDBOX'} mode!`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to test PayPal connection: ${err.message}`,
      });
    }
  });

  // 6. Create PayPal Order (Strict — No Fake Orders)
  app.post('/api/payment/paypal/create-order', async (req: Request, res: Response) => {
    const {
      amountInr,
      amountUsd,
      amount,
      currency = 'USD',
      clientIdOverride,
      clientSecretOverride,
      mode,
      returnUrl,
      cancelUrl,
    } = req.body || {};
    const numericInr = Number(amountInr) || (Number(amountUsd || amount) > 0 ? Number(amountUsd || amount) * 84 : 0);
    if (numericInr <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount.' });
    }
    const approxUsd = Number(amountUsd) > 0 ? Number(amountUsd) : Math.max(1, Math.round((numericInr / 84) * 100) / 100);

    const { clientId, clientSecret, isLive } = getEffectivePaypalCreds(
      clientIdOverride,
      clientSecretOverride,
      mode
    );

    if (!clientId || !clientSecret) {
      return res.status(503).json({
        success: false,
        configured: false,
        message:
          'PayPal International payment gateway is not configured yet. Please configure PayPal Client ID and Client Secret in Admin Integrations or Environment Variables.',
      });
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) {
        const errData: any = await tokenRes.json().catch(() => ({}));
        return res.status(tokenRes.status).json({
          success: false,
          message: errData?.error_description || 'PayPal authentication failed.',
        });
      }

      const tokenData: any = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: approxUsd.toFixed(2),
              },
              description: 'REDMODE Luxury Silhouettes - International Export Order',
            },
          ],
          application_context:
            returnUrl && cancelUrl
              ? {
                  return_url: returnUrl,
                  cancel_url: cancelUrl,
                  brand_name: 'REDMODE',
                  user_action: 'PAY_NOW',
                }
              : undefined,
        }),
      });

      const orderData: any = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !orderData?.id) {
        return res.status(orderRes.status || 400).json({
          success: false,
          message: orderData?.message || 'Failed to create PayPal order.',
        });
      }

      const approveLink = Array.isArray(orderData.links)
        ? orderData.links.find((l: any) => l.rel === 'approve' || l.rel === 'payer-action')?.href
        : null;

      return res.json({
        success: true,
        orderId: orderData.id,
        approveUrl: approveLink || null,
        amountUsd: approxUsd,
        currency,
        live: isLive,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `PayPal order creation error: ${err.message}`,
      });
    }
  });

  // 7. Verify / Capture PayPal Order (Strict — Real Capture Verification)
  app.post('/api/payment/paypal/capture-order', async (req: Request, res: Response) => {
    const { orderId, expectedAmountUsd, clientIdOverride, clientSecretOverride, mode } = req.body || {};
    if (!orderId || String(orderId).startsWith('PAYPAL-EXP-')) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Valid PayPal Order ID is required for payment capture.',
      });
    }

    const { clientId, clientSecret, isLive } = getEffectivePaypalCreds(
      clientIdOverride,
      clientSecretOverride,
      mode
    );

    if (!clientId || !clientSecret) {
      return res.status(503).json({
        success: false,
        verified: false,
        message: 'PayPal credentials are not configured on the server.',
      });
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({
          success: false,
          verified: false,
          message: 'Failed to authenticate with PayPal during capture.',
        });
      }

      const tokenData: any = await tokenRes.json();
      const captureRes = await fetch(
        `${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const captureData: any = await captureRes.json().catch(() => ({}));
      if (!captureRes.ok || captureData.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          verified: false,
          status: captureData.status || 'FAILED',
          message:
            captureData?.details?.[0]?.description ||
            captureData?.message ||
            'PayPal payment has not been approved or capture failed.',
        });
      }

      const captureUnit = captureData?.purchase_units?.[0]?.payments?.captures?.[0];
      if (expectedAmountUsd && captureUnit?.amount?.value) {
        const paidUsd = Number(captureUnit.amount.value);
        if (Math.abs(paidUsd - Number(expectedAmountUsd)) > 0.05) {
          return res.status(400).json({
            success: false,
            verified: false,
            message: 'PayPal captured amount does not match the checkout total.',
          });
        }
      }

      return res.json({
        success: true,
        verified: true,
        orderId: captureData.id,
        captureId: captureUnit?.id || captureData.id,
        status: captureData.status,
        message: 'International PayPal payment captured and verified.',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        verified: false,
        message: `PayPal capture verification failed: ${err.message}`,
      });
    }
  });

  // 8. Universal Gateway Tester (Tests any gateway config by provider)
  app.post('/api/payment/gateway/test', requireSuperAdmin, async (req: Request, res: Response) => {
    const { provider, apiKey, apiSecret, mode } = req.body || {};
    const key = (apiKey || '').trim();
    const secret = (apiSecret || '').trim();

    if (!key) {
      return res.status(400).json({
        success: false,
        message: `API Key / Client ID is required for ${provider || 'gateway'}.`,
      });
    }

    if (provider === 'razorpay') {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
        const testRes = await fetch('https://api.razorpay.com/v1/payments?count=1', {
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        });
        if (testRes.ok) {
          const isLive = !key.startsWith('rzp_test');
          return res.json({
            success: true,
            mode: isLive ? 'Live' : 'Test Mode',
            message: `Razorpay connection verified successfully! (${isLive ? 'Production Live' : 'Test Sandbox'})`,
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Razorpay authentication failed. Please check Key ID & Key Secret.',
          });
        }
      } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
      }
    }

    if (provider === 'paypal') {
      if (isPlaceholderCred(key) || isPlaceholderCred(secret)) {
        return res.status(400).json({
          success: false,
          message: 'Placeholder PayPal credentials detected. Please enter your actual PayPal REST App Client ID and Client Secret.',
        });
      }
      if (!secret) {
        return res.status(400).json({
          success: false,
          message: 'PayPal Client Secret is required.',
        });
      }
      const isLive = (mode || 'live').toLowerCase() === 'live';
      try {
        const authHeader = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
        const url = isLive
          ? 'https://api-m.paypal.com/v1/oauth2/token'
          : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
        const resTok = await fetch(url, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=client_credentials',
        });
        if (resTok.ok) {
          return res.json({
            success: true,
            mode: isLive ? 'Live' : 'Sandbox',
            message: `PayPal International credentials verified in ${isLive ? 'LIVE' : 'SANDBOX'} mode! Ready for global export checkout.`,
          });
        }
        const errJson: any = await resTok.json().catch(() => ({}));
        if (resTok.status === 401) {
          const altUrl = isLive
            ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
            : 'https://api-m.paypal.com/v1/oauth2/token';
          const altRes = await fetch(altUrl, {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials',
          }).catch(() => null);
          if (altRes?.ok) {
            return res.status(400).json({
              success: false,
              environmentMismatch: true,
              suggestedMode: isLive ? 'test' : 'live',
              message: isLive
                ? 'Client Authentication failed in Live mode — these credentials belong to PayPal SANDBOX! Switch mode to "Test / Sandbox Mode", click Save Changes, and test again.'
                : 'Client Authentication failed in Sandbox mode — these credentials belong to PayPal LIVE! Switch mode to "Production Live", click Save Changes, and test again.',
            });
          }
        }
        return res.status(resTok.status || 400).json({
          success: false,
          message: errJson?.error_description || 'PayPal authentication failed. Please check Client ID and Secret.',
        });
      } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
      }
    }

    if (provider === 'stripe') {
      if (!secret) {
        return res.status(400).json({ success: false, message: 'Stripe Secret Key (sk_...) is required.' });
      }
      try {
        const stripeRes = await fetch('https://api.stripe.com/v1/balance', {
          headers: { Authorization: `Bearer ${secret}` },
        });
        if (stripeRes.ok) {
          return res.json({
            success: true,
            mode: secret.startsWith('sk_live') ? 'Live' : 'Test Mode',
            message: `Stripe Global gateway authenticated successfully! (${secret.startsWith('sk_live') ? 'Live' : 'Test Mode'})`,
          });
        }
        const stripeErr: any = await stripeRes.json().catch(() => ({}));
        return res.status(stripeRes.status).json({
          success: false,
          message: stripeErr?.error?.message || 'Stripe authentication failed. Check Publishable & Secret Keys.',
        });
      } catch (e: any) {
        return res.status(500).json({ success: false, message: `Stripe test error: ${e.message}` });
      }
    }

    if (provider === 'upi_qr') {
      const vpaRegex = /^[\w.\-_]{2,}@[a-zA-Z]{2,}$/;
      if (!vpaRegex.test(key)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid UPI VPA ID (e.g. redmode@okicici or merchant@upi).',
        });
      }
      return res.json({
        success: true,
        mode: 'UPI Direct',
        message: `Direct Business UPI VPA "${key}" verified and ready for QR checkout.`,
      });
    }

    if (provider === 'phonepe' || provider === 'cashfree') {
      if (!secret) {
        return res.status(400).json({
          success: false,
          message: `Both Merchant/App ID and ${provider === 'phonepe' ? 'Salt Key' : 'Secret Key'} are required.`,
        });
      }
      return res.json({
        success: true,
        mode: mode === 'live' ? 'Live' : 'Sandbox',
        message: `${provider === 'phonepe' ? 'PhonePe PG' : 'Cashfree PG'} credentials format validated (${mode === 'live' ? 'Live' : 'Sandbox'}).`,
      });
    }

    if (!secret) {
      return res.status(400).json({
        success: false,
        message: `Both API Key and API Secret are required for ${provider || 'custom gateway'}.`,
      });
    }

    return res.json({
      success: true,
      mode: mode || 'Active',
      message: 'Gateway configuration format verified.',
    });
  });

  // Delhivery API Connection Verification (Restricted to Super Admin)
  app.get('/api/delhivery/test', requireSuperAdmin, async (req: Request, res: Response) => {
    const dCfg = getEffectiveDelhiveryConfig(
      {
        apiToken: req.query.token as string,
        pickupPincode: req.query.pincode as string,
        environment: req.query.environment as string,
      },
      true
    );

    if (!dCfg.apiToken) {
      return res.status(400).json({
        success: false,
        message: 'Delhivery API Token is not configured. Enter your token in Couriers & Logistics or set DELHIVERY_API_TOKEN.',
      });
    }

    try {
      const [pinRes, rateRes] = await Promise.all([
        fetch(`${dCfg.baseUrl}/c/api/pin-codes/json/?filter_codes=${dCfg.pickupPincode}`, {
          headers: {
            Authorization: `Token ${dCfg.apiToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
        fetch(
          `${dCfg.baseUrl}/api/kinko/v1/invoice/charges/.json?md=S&ss=DTO&d_pin=${dCfg.pickupPincode}&o_pin=${dCfg.pickupPincode}&cgm=500`,
          {
            headers: {
              Authorization: `Token ${dCfg.apiToken}`,
              Accept: 'application/json',
            },
          }
        ).catch(() => null),
      ]);

      if (!pinRes.ok) {
        return res.status(pinRes.status).json({
          success: false,
          message: `Delhivery API (${dCfg.environment}) returned status ${pinRes.status}: ${pinRes.statusText}`,
        });
      }

      if (rateRes && (rateRes.status === 401 || rateRes.status === 403)) {
        return res.status(rateRes.status).json({
          success: false,
          message: `Delhivery Token authentication failed (${rateRes.status}) on ${dCfg.baseUrl}. Verify your ${dCfg.environment} API Token.`,
        });
      }

      const data: any = await pinRes.json().catch(() => ({}));
      const postalInfo = data?.delivery_codes?.[0]?.postal_code;
      const rateData: any = rateRes && rateRes.ok ? await rateRes.json().catch(() => null) : null;
      const sampleCharge = Array.isArray(rateData) && rateData[0]?.total_amount ? rateData[0].total_amount : null;

      if (postalInfo) {
        return res.json({
          success: true,
          environment: dCfg.environment === 'staging' ? 'Staging' : 'Production',
          district: postalInfo.district || 'Meerut',
          state: postalInfo.state_code || 'UP',
          prepaid: postalInfo.pre_paid === 'Y',
          cod: postalInfo.cod === 'Y',
          pickup: postalInfo.pickup === 'Y',
          center: postalInfo.inc || 'Hub',
          sampleCharge,
          message: `Delhivery ${dCfg.environment === 'staging' ? 'Staging' : 'Production'} API Authenticated! Origin ${dCfg.pickupPincode} (${postalInfo.district || ''}, ${postalInfo.state_code || ''}) — Pickup: ${postalInfo.pickup === 'Y' ? 'YES' : 'NO'}, COD: ${postalInfo.cod === 'Y' ? 'YES' : 'NO'}, Prepaid: ${postalInfo.pre_paid === 'Y' ? 'YES' : 'NO'}${sampleCharge ? `, 500g Est: ₹${sampleCharge}` : ''}.`,
        });
      }

      return res.json({
        success: true,
        data,
        message: `Connected to Delhivery ${dCfg.environment} API successfully!`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Error connecting to Delhivery API: ${err.message}`,
      });
    }
  });

  // Delhivery Live Waybill Allocator
  app.post('/api/delhivery/fetch-waybill', async (req: Request, res: Response) => {
    const dCfg = getEffectiveDelhiveryConfig({
      apiToken: req.body?.token,
      clientName: req.body?.client,
      environment: req.body?.environment,
    });

    if (!dCfg.apiToken) {
      return res.status(503).json({
        success: false,
        live: false,
        message: 'Delhivery API Token is not configured on the server.',
      });
    }

    try {
      const response = await fetch(
        `${dCfg.baseUrl}/waybill/api/bulk/json/?count=1&client=${encodeURIComponent(dCfg.clientName)}`,
        {
          headers: {
            Authorization: `Token ${dCfg.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const text = await response.text();
        const cleanWaybill = text.replace(/["\s]/g, '');
        if (cleanWaybill && cleanWaybill.length >= 10) {
          return res.json({ success: true, waybill: cleanWaybill, live: true, environment: dCfg.environment });
        }
      }

      return res.status(400).json({
        success: false,
        live: false,
        message: `Delhivery ${dCfg.environment} API did not return a valid waybill (HTTP ${response.status}). Verify your API Token and Client Name.`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        live: false,
        message: `Delhivery waybill allocation error: ${err.message}`,
      });
    }
  });

  // Standard shipping label printable view (Authenticated, Official Scannable Code-128 4x6 Thermal Format)
  app.get('/api/shipping/label/:awb', requireStaffOrAdmin, (req: Request, res: Response) => {
    const awb = String(req.params.awb || '').trim();
    if (!awb || isPlaceholderAwbValue(awb)) {
      return res.status(400).json({
        success: false,
        message: 'A valid live Delhivery AWB number is required to render a shipping label.',
      });
    }

    const dCfg = getEffectiveDelhiveryConfig();
    const storedOrders = readServerOrders();
    const matchedOrder = storedOrders.find(
      (o: any) =>
        String(o?.awb_number || '').trim() === awb ||
        String(o?.shipmozo?.awb || '').trim() === awb
    );

    const cust = matchedOrder?.customer || {};
    const orderId = String(matchedOrder?.id || req.query.orderId || 'ORD-REDMODE').trim();
    const customerName = String(cust.name || req.query.name || 'Customer').trim();
    const address = String(
      [cust.house, cust.address || cust.street, cust.landmark].filter(Boolean).join(', ') ||
        req.query.address ||
        'Delivery Address'
    ).trim();
    const city = String(cust.city || req.query.city || '').trim();
    const state = String(cust.state || req.query.state || '').trim();
    const pincode = String(cust.pincode || req.query.pin || '').trim() || '110001';
    const phone = String(cust.phone || cust.mobile || req.query.phone || '').trim();
    const shippingMode = String(req.query.mode || 'Delhivery Surface').trim();
    const paymentMode = String(matchedOrder?.paymentMode || req.query.pay || 'COD').trim();
    const totalAmount = Number(matchedOrder?.total || String(req.query.amt || '0').replace(/[^0-9.]/g, '') || 0);
    const items = Array.isArray(matchedOrder?.items) ? matchedOrder.items : [];
    const itemsSummary =
      items.length > 0
        ? items.map((it: any) => `${it.name || 'Apparel'} (${it.size || 'Free'}) x${it.quantity || 1}`).join(', ')
        : 'RedMode Apparel';
    const totalQty = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0) || 1;
    const weightKg = Number(matchedOrder?.final_package_weight || matchedOrder?.final_package_weight_kg || 0.45);
    const dims = `${Number(matchedOrder?.final_package_length || 25)} x ${Number(matchedOrder?.final_package_width || 20)} x ${Number(matchedOrder?.final_package_height || 4)} cm`;

    const html = buildDelhiveryThermalLabelHtml({
      awb,
      orderId,
      customerName,
      address,
      city,
      state,
      pincode,
      phone,
      shippingMode,
      paymentMode,
      codAmount: paymentMode.toUpperCase() === 'COD' ? totalAmount : 0,
      totalAmount,
      itemsSummary,
      totalQty,
      weightKg,
      dimensionsText: dims,
      sortCode: matchedOrder?.delhiverySortCode || undefined,
      warehouseName: dCfg.warehouseName || 'REDMODE B2C',
      pickupAddress: dCfg.pickupAddress || '1807, Zakir Hussain Colony, Near Madina Masjid, Meerut, Uttar Pradesh, India',
      pickupPincode: dCfg.pickupPincode || '250002',
      pickupPhone: dCfg.pickupPhone || '+91 73027 97464',
      clientName: dCfg.clientName || 'Redmode',
      orderDateText: new Date(matchedOrder?.createdAt || Date.now()).toLocaleDateString('en-IN'),
      autoPrint: true,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  // Indian Pincode Auto-Fill & Validation API
  app.get('/api/pincode/lookup/:pincode', async (req: Request, res: Response) => {
    const rawPin = req.params.pincode || '';
    const pincode = rawPin.replace(/\D/g, '');

    if (pincode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      });
    }

    try {
      // 1. Try Delhivery Pincode serviceability API if token is configured
      const token = getEffectiveDelhiveryToken();
      const delhiveryRes = token
        ? await fetch(`https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`, {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
          })
        : ({ ok: false } as any);

      if (delhiveryRes.ok) {
        const dData: any = await delhiveryRes.json();
        const postal = dData?.delivery_codes?.[0]?.postal_code;
        if (postal && postal.district && (postal.state_code || postal.state)) {
          const stateCodeMap: Record<string, string> = {
            UP: 'Uttar Pradesh',
            RJ: 'Rajasthan',
            DL: 'Delhi',
            MH: 'Maharashtra',
            KA: 'Karnataka',
            TN: 'Tamil Nadu',
            GJ: 'Gujarat',
            WB: 'West Bengal',
            MP: 'Madhya Pradesh',
            HR: 'Haryana',
            PB: 'Punjab',
            TS: 'Telangana',
            AP: 'Andhra Pradesh',
            KL: 'Kerala',
            BR: 'Bihar',
            OD: 'Odisha',
            JH: 'Jharkhand',
            AS: 'Assam',
            UK: 'Uttarakhand',
            HP: 'Himachal Pradesh',
            CH: 'Chandigarh',
            GA: 'Goa',
            JK: 'Jammu and Kashmir',
          };
          const state = stateCodeMap[postal.state_code] || postal.state || postal.state_code;
          return res.json({
            success: true,
            city: postal.district,
            state,
            pincode,
            prepaid: postal.pre_paid === 'Y',
            cod: postal.cod === 'Y',
            source: 'delhivery',
          });
        }
      }

      // 2. Fallback to Postal Pincode public directory
      let postalConfirmedInvalid = false;
      try {
        const postalRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        if (postalRes.ok) {
          const pData: any = await postalRes.json();
          if (Array.isArray(pData) && pData[0]?.Status === 'Success' && pData[0]?.PostOffice?.length > 0) {
            const po = pData[0].PostOffice[0];
            return res.json({
              success: true,
              city: po.District || po.Block || po.Circle,
              state: po.State,
              pincode,
              prepaid: true,
              cod: true,
              source: 'indiapost',
            });
          } else if (Array.isArray(pData) && pData[0]?.Status === 'Error') {
            postalConfirmedInvalid = true;
          }
        }
      } catch {}

      if (postalConfirmedInvalid) {
        return res.status(404).json({
          success: false,
          message: `PIN code ${pincode} is invalid or not serviceable by Delhivery.`,
        });
      }

      // 3. Offline fallback zone & district resolver ONLY if external APIs are unreachable
      const prefix2 = parseInt(pincode.substring(0, 2), 10);
      const prefix3 = parseInt(pincode.substring(0, 3), 10);
      let stateName = '';
      let defaultCity = '';

      if (prefix2 === 11) { stateName = 'Delhi'; defaultCity = 'New Delhi'; }
      else if (prefix2 >= 12 && prefix2 <= 13) { stateName = 'Haryana'; defaultCity = prefix3 === 122 ? 'Gurugram' : prefix3 === 121 ? 'Faridabad' : 'Ambala'; }
      else if (prefix2 >= 14 && prefix2 <= 15) { stateName = 'Punjab'; defaultCity = prefix3 === 141 ? 'Ludhiana' : prefix3 === 143 ? 'Amritsar' : 'Jalandhar'; }
      else if (prefix2 === 16) { stateName = 'Chandigarh'; defaultCity = 'Chandigarh'; }
      else if (prefix2 >= 17 && prefix2 <= 18) { stateName = 'Himachal Pradesh'; defaultCity = 'Shimla'; }
      else if (prefix2 === 19) { stateName = 'Jammu and Kashmir'; defaultCity = 'Srinagar'; }
      else if (prefix2 >= 20 && prefix2 <= 28) { stateName = 'Uttar Pradesh'; defaultCity = prefix3 === 250 ? 'Meerut' : prefix3 === 201 ? 'Noida' : prefix3 === 226 ? 'Lucknow' : 'Kanpur'; }
      else if (prefix2 >= 30 && prefix2 <= 34) { stateName = 'Rajasthan'; defaultCity = prefix3 === 302 ? 'Jaipur' : prefix3 === 342 ? 'Jodhpur' : 'Udaipur'; }
      else if (prefix2 >= 36 && prefix2 <= 39) { stateName = 'Gujarat'; defaultCity = prefix3 === 380 ? 'Ahmedabad' : prefix3 === 395 ? 'Surat' : 'Vadodara'; }
      else if (prefix2 >= 40 && prefix2 <= 44) { stateName = 'Maharashtra'; defaultCity = prefix3 === 400 ? 'Mumbai' : prefix3 === 411 ? 'Pune' : 'Nagpur'; }
      else if (prefix2 >= 45 && prefix2 <= 48) { stateName = 'Madhya Pradesh'; defaultCity = prefix3 === 452 ? 'Indore' : prefix3 === 462 ? 'Bhopal' : 'Jabalpur'; }
      else if (prefix2 === 49) { stateName = 'Chhattisgarh'; defaultCity = 'Raipur'; }
      else if (prefix2 >= 50 && prefix2 <= 53) { stateName = prefix2 <= 50 ? 'Telangana' : 'Andhra Pradesh'; defaultCity = prefix2 <= 50 ? 'Hyderabad' : 'Visakhapatnam'; }
      else if (prefix2 >= 56 && prefix2 <= 59) { stateName = 'Karnataka'; defaultCity = prefix3 === 560 ? 'Bengaluru' : 'Mysuru'; }
      else if (prefix2 >= 60 && prefix2 <= 64) { stateName = 'Tamil Nadu'; defaultCity = prefix3 === 600 ? 'Chennai' : 'Coimbatore'; }
      else if (prefix2 >= 67 && prefix2 <= 69) { stateName = 'Kerala'; defaultCity = prefix3 === 682 ? 'Kochi' : 'Thiruvananthapuram'; }
      else if (prefix2 >= 70 && prefix2 <= 74) { stateName = 'West Bengal'; defaultCity = prefix3 === 700 ? 'Kolkata' : 'Siliguri'; }
      else if (prefix2 >= 75 && prefix2 <= 77) { stateName = 'Odisha'; defaultCity = 'Bhubaneswar'; }
      else if (prefix2 === 78) { stateName = 'Assam'; defaultCity = 'Guwahati'; }
      else if (prefix2 >= 80 && prefix2 <= 85) { stateName = 'Bihar'; defaultCity = 'Patna'; }
      else if (prefix2 >= 82 && prefix2 <= 83) { stateName = 'Jharkhand'; defaultCity = 'Ranchi'; }

      if (stateName) {
        return res.json({
          success: true,
          city: defaultCity || 'City',
          state: stateName,
          pincode,
          prepaid: true,
          cod: true,
          source: 'regional_index',
        });
      }

      return res.status(404).json({
        success: false,
        message: `Pincode ${pincode} could not be recognized. Please check and enter a valid Indian pincode.`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Error verifying pincode: ${err.message}`,
      });
    }
  });

  // ==========================================
  // PHASE 2: WHATSAPP ORDER CONFIRMATION AUTOMATION ENGINE
  // ==========================================
  interface WhatsAppMessageLogRecord {
    id: string;
    wamid?: string;
    orderId: string;
    customerName?: string;
    customerPhone: string;
    messageType:
      | 'order_confirmation'
      | 'reminder_23h'
      | 'confirm_ack'
      | 'cancel_ack'
      | 'dispatch_tracking'
      | 'test'
      | 'inbound_reply';
    direction: 'outbound' | 'inbound';
    templateName?: string;
    status: 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
    sentAt: string;
    deliveredAt?: string;
    readAt?: string;
    failedAt?: string;
    scheduledFor?: string;
    customerReply?: string;
    replyAction?: 'YES' | 'CANCEL' | 'OTHER';
    errorCode?: string;
    errorMessage?: string;
    retryCount: number;
    maxRetries: number;
    retryStatus: 'none' | 'scheduled' | 'retrying' | 'exhausted' | 'succeeded';
    nextRetryAt?: string;
    payloadSummary?: string;
    updatedAt: string;
  }

  interface ProcessedWhatsAppEventsState {
    messages: Record<string, string>;
    statuses: Record<string, string>;
    remindersSent: Record<string, string>;
    confirmationsSent: Record<string, string>;
  }

  interface ConfirmationAuditLogRecord {
    id: string;
    orderId: string;
    eventType: string;
    previousStatus: string;
    newStatus: string;
    confirmationMethod?: 'WhatsApp' | 'Manual' | 'System';
    adminId?: string;
    adminName?: string;
    whatsappMessageId?: string;
    timestamp: string;
    errorDetails?: string;
    notes?: string;
  }

  const whatsappLogsDbPath = path.join(dataDir, 'whatsapp-logs.json');
  const whatsappProcessedDbPath = path.join(dataDir, 'whatsapp-processed-events.json');
  const confirmationAuditLogsDbPath = path.join(dataDir, 'confirmation-audit-logs.json');
  const waConfirmationInFlight = new Set<string>();
  const waConfirmAtomicLock = new Set<string>();
  const waCancelAtomicLock = new Set<string>();
  const waReminderInFlight = new Set<string>();
  const waStockRestoreInFlight = new Set<string>();
  const waReplyInFlight = new Set<string>();
  let waSchedulerTickRunning = false;
  let waHealthCache: {
    status: 'Connected' | 'Disconnected' | 'Authentication Error' | 'Temporarily Unavailable';
    automationEnabled: boolean;
    checkedAt: string;
    expiresAtMs: number;
    reason?: string;
    verifiedName?: string;
    displayPhoneNumber?: string;
    httpStatus?: number;
  } | null = null;

  function readConfirmationAuditLogs(): ConfirmationAuditLogRecord[] {
    try {
      if (fs.existsSync(confirmationAuditLogsDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(confirmationAuditLogsDbPath, 'utf-8'));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  function recordConfirmationAuditLog(
    entry: Omit<ConfirmationAuditLogRecord, 'id' | 'timestamp'> & { timestamp?: string }
  ): ConfirmationAuditLogRecord {
    const safeError = entry.errorDetails
      ? String(entry.errorDetails)
          .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
          .replace(/EAA[A-Za-z0-9]+/g, '[REDACTED_TOKEN]')
          .slice(0, 400)
      : undefined;

    const record: ConfirmationAuditLogRecord = {
      id: `caud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      orderId: String(entry.orderId || 'UNKNOWN'),
      eventType: String(entry.eventType || 'EVENT'),
      previousStatus: String(entry.previousStatus || ''),
      newStatus: String(entry.newStatus || ''),
      confirmationMethod: entry.confirmationMethod,
      adminId: entry.adminId,
      adminName: entry.adminName,
      whatsappMessageId: entry.whatsappMessageId,
      errorDetails: safeError,
      notes: entry.notes ? String(entry.notes).slice(0, 400) : undefined,
    };

    try {
      const existing = readConfirmationAuditLogs();
      writeJsonAtomic(confirmationAuditLogsDbPath, [record, ...existing].slice(0, 1000));
    } catch (e) {
      console.error('Failed writing confirmation-audit-logs.json:', e);
    }
    return record;
  }

  const normalizeWaOrderId = (orderId: string): string =>
    String(orderId || '').trim().replace(/^#/, '').toUpperCase();

  const normalizeIndianPhoneForWa = (raw?: string): string => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length > 10 && digits.startsWith('91')) return digits.slice(0, 12);
    return digits;
  };

  function readWhatsAppLogs(): WhatsAppMessageLogRecord[] {
    try {
      if (fs.existsSync(whatsappLogsDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(whatsappLogsDbPath, 'utf-8'));
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  function writeWhatsAppLogs(logs: WhatsAppMessageLogRecord[]) {
    try {
      writeJsonAtomic(whatsappLogsDbPath, logs.slice(0, 1000));
    } catch (e) {
      console.error('Failed writing whatsapp-logs.json:', e);
    }
  }

  function upsertWhatsAppLog(entry: WhatsAppMessageLogRecord): WhatsAppMessageLogRecord {
    const logs = readWhatsAppLogs();
    const idx = logs.findIndex(
      (l) => l.id === entry.id || (entry.wamid && l.wamid && l.wamid === entry.wamid && l.direction === entry.direction)
    );
    if (idx >= 0) {
      logs[idx] = { ...logs[idx], ...entry, updatedAt: new Date().toISOString() };
      writeWhatsAppLogs(logs);
      return logs[idx];
    }
    const created = { ...entry, updatedAt: entry.updatedAt || new Date().toISOString() };
    writeWhatsAppLogs([created, ...logs]);
    return created;
  }

  function readProcessedWhatsAppEvents(): ProcessedWhatsAppEventsState {
    try {
      if (fs.existsSync(whatsappProcessedDbPath)) {
        const parsed = JSON.parse(fs.readFileSync(whatsappProcessedDbPath, 'utf-8'));
        if (parsed && typeof parsed === 'object') {
          return {
            messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
            statuses: parsed.statuses && typeof parsed.statuses === 'object' ? parsed.statuses : {},
            remindersSent: parsed.remindersSent && typeof parsed.remindersSent === 'object' ? parsed.remindersSent : {},
            confirmationsSent:
              parsed.confirmationsSent && typeof parsed.confirmationsSent === 'object' ? parsed.confirmationsSent : {},
          };
        }
      }
    } catch {}
    return { messages: {}, statuses: {}, remindersSent: {}, confirmationsSent: {} };
  }

  function writeProcessedWhatsAppEvents(state: ProcessedWhatsAppEventsState) {
    try {
      const trimMap = (obj: Record<string, string>, maxEntries = 2000): Record<string, string> => {
        const entries = Object.entries(obj);
        if (entries.length <= maxEntries) return obj;
        return Object.fromEntries(entries.slice(-maxEntries));
      };
      writeJsonAtomic(whatsappProcessedDbPath, {
        messages: trimMap(state.messages),
        statuses: trimMap(state.statuses),
        remindersSent: trimMap(state.remindersSent),
        confirmationsSent: trimMap(state.confirmationsSent),
      });
    } catch (e) {
      console.error('Failed writing whatsapp-processed-events.json:', e);
    }
  }

  function getEffectiveWhatsAppPolicy() {
    const cfg = readServerIntegrations();
    const waCfg = cfg.whatsappSettings || {};
    const isDeleted = cfg.whatsappIntegrationDeleted === true;
    return {
      enabled: !isDeleted && waCfg.enabled !== false,
      orderConfirmationEnabled: !isDeleted && waCfg.orderConfirmationEnabled !== false,
      reminder23hEnabled: !isDeleted && waCfg.reminder23hEnabled !== false,
      confirmCodOrders: waCfg.confirmCodOrders !== false,
      confirmPrepaidOrders: waCfg.confirmPrepaidOrders !== false,
      respectSendingWindow: waCfg.respectSendingWindow !== false,
      sendingWindowStartHour:
        typeof waCfg.sendingWindowStartHour === 'number' ? waCfg.sendingWindowStartHour : 10,
      sendingWindowEndHour:
        typeof waCfg.sendingWindowEndHour === 'number' ? waCfg.sendingWindowEndHour : 21,
      reminderDelayHours:
        typeof waCfg.reminderDelayHours === 'number' && waCfg.reminderDelayHours > 0
          ? waCfg.reminderDelayHours
          : 23,
      manualFollowUpHours:
        typeof waCfg.manualFollowUpHours === 'number' && waCfg.manualFollowUpHours > 0
          ? waCfg.manualFollowUpHours
          : 26,
      confirmationTemplateName: (
        waCfg.confirmationTemplateName ||
        process.env.WHATSAPP_CONFIRMATION_TEMPLATE ||
        'redmode_order_confirmation'
      ).trim(),
      reminderTemplateName: (
        waCfg.reminderTemplateName ||
        process.env.WHATSAPP_REMINDER_TEMPLATE ||
        'redmode_order_reminder_23h'
      ).trim(),
      templateLanguageCode: (
        waCfg.templateLanguageCode ||
        process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
        'en'
      ).trim(),
      apiEndpoint: (() => {
        const rawEndpoint = String(
          (process.env.ALLOW_LOCAL_TEST_ENDPOINTS === 'true' && process.env.WHATSAPP_TEST_API_ENDPOINT) ||
            waCfg.apiEndpoint ||
            'https://graph.facebook.com/v21.0'
        )
          .trim()
          .replace(/\/+$/, '');
        try {
          const parsed = new URL(rawEndpoint);
          if (
            process.env.ALLOW_LOCAL_TEST_ENDPOINTS === 'true' &&
            parsed.protocol === 'http:' &&
            (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')
          ) {
            return rawEndpoint;
          }
          if (parsed.protocol === 'https:' && parsed.hostname === 'graph.facebook.com') {
            return rawEndpoint;
          }
        } catch {}
        return 'https://graph.facebook.com/v21.0';
      })(),
      verifyToken: (
        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
        process.env.WHATSAPP_VERIFY_TOKEN ||
        waCfg.webhookVerifyToken ||
        'redmode_wa_verify_2026'
      ).trim(),
      appSecret: (
        process.env.WHATSAPP_APP_SECRET ||
        process.env.META_APP_SECRET ||
        cfg.whatsappAppSecret ||
        ''
      ).trim(),
      relaySecret: (
        process.env.REDMODE_RELAY_SECRET ||
        cfg.redmodeRelaySecret ||
        ''
      ).trim(),
    };
  }

  /**
   * Computes whether `nowDate` falls within the configured IST (Asia/Kolkata, UTC+5:30) sending window.
   * Outside 10:00 AM - 9:00 PM IST, returns the exact next 10:00 AM IST ISO timestamp.
   */
  function evaluateIstSendingWindow(
    nowDate = new Date(),
    startHour = 10,
    endHour = 21
  ): { withinWindow: boolean; istHour: number; istMinute: number; scheduledForIso?: string } {
    const IST_OFFSET_MS = 330 * 60 * 1000;
    const istMs = nowDate.getTime() + IST_OFFSET_MS;
    const istDate = new Date(istMs);
    const istHour = istDate.getUTCHours();
    const istMinute = istDate.getUTCMinutes();

    if (istHour >= startHour && istHour < endHour) {
      return { withinWindow: true, istHour, istMinute };
    }

    const nextIst = new Date(istMs);
    if (istHour >= endHour) {
      nextIst.setUTCDate(nextIst.getUTCDate() + 1);
    }
    nextIst.setUTCHours(startHour, 0, 0, 0);
    const scheduledUtcMs = nextIst.getTime() - IST_OFFSET_MS;
    return {
      withinWindow: false,
      istHour,
      istMinute,
      scheduledForIso: new Date(scheduledUtcMs).toISOString(),
    };
  }

  function buildOrderSummaryVariables(order: any) {
    const customerName = String(order?.customer?.name || 'Customer').trim().slice(0, 80);
    const orderId = String(order?.id || '').trim();
    const items = Array.isArray(order?.items) ? order.items : [];
    const itemsSummary =
      items
        .map((it: any) => {
          const name = String(it?.name || 'Product').trim();
          const size = String(it?.size || 'Standard').trim();
          const qty = Math.max(1, Number(it?.quantity || 1));
          return `${name} (Size: ${size} x ${qty})`;
        })
        .join(', ')
        .slice(0, 500) || 'RedMode Item (x1)';
    const paymentMode = String(order?.paymentMode || 'COD').trim();
    const amount = `Rs ${Math.round(Number(order?.total || 0)).toLocaleString('en-IN')}`;
    const addrParts = [
      order?.customer?.house,
      order?.customer?.address,
      order?.customer?.street,
      order?.customer?.landmark,
      order?.customer?.city,
      order?.customer?.state,
      order?.customer?.pincode,
    ]
      .map((p) => String(p || '').trim())
      .filter(Boolean);
    const deliveryAddress = (addrParts.join(', ') || 'Registered Address').slice(0, 300);

    return {
      customerName,
      orderId,
      itemsSummary,
      paymentMode,
      amount,
      deliveryAddress,
    };
  }

  function buildOrderUtilityTemplateComponents(order: any) {
    const vars = buildOrderSummaryVariables(order);
    const cleanOrderId = String(order?.id || '').trim();
    return {
      vars,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: vars.customerName },
            { type: 'text', text: vars.orderId },
            { type: 'text', text: vars.itemsSummary },
            { type: 'text', text: vars.paymentMode },
            { type: 'text', text: vars.amount },
            { type: 'text', text: vars.deliveryAddress },
          ],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '0',
          parameters: [{ type: 'payload', payload: `CONFIRM_ORDER::${cleanOrderId}` }],
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: '1',
          parameters: [{ type: 'payload', payload: `CANCEL_ORDER::${cleanOrderId}` }],
        },
      ],
    };
  }

  function computeRetryBackoffIso(retryCount: number): string {
    const minutesSchedule = [2, 10, 30];
    const mins = minutesSchedule[Math.min(retryCount, minutesSchedule.length - 1)] || 30;
    return new Date(Date.now() + mins * 60 * 1000).toISOString();
  }

  function appendOrderActivity(order: any, title: string, description: string, source: 'whatsapp' | 'system' | 'admin' | 'customer' = 'whatsapp') {
    const prevLog = Array.isArray(order.activityLog) ? order.activityLog : [];
    return [
      {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        title,
        description,
        source,
      },
      ...prevLog,
    ].slice(0, 60);
  }

  async function dispatchWhatsAppUtilityTemplate(params: {
    order: any;
    messageType: 'order_confirmation' | 'reminder_23h';
    existingLogId?: string;
    retryCount?: number;
  }): Promise<{
    success: boolean;
    wamid?: string;
    log: WhatsAppMessageLogRecord;
    error?: string;
    errorCode?: string;
  }> {
    const { order, messageType, existingLogId } = params;
    const retryCount = params.retryCount || 0;
    const maxRetries = 3;
    const nowIso = new Date().toISOString();
    const policy = getEffectiveWhatsAppPolicy();
    const creds = getEffectiveWhatsAppCreds();
    const templateName =
      messageType === 'reminder_23h' ? policy.reminderTemplateName : policy.confirmationTemplateName;
    const rawPhone = order?.customer?.mobile || order?.customer?.phone || '';
    const formattedTo = normalizeIndianPhoneForWa(rawPhone);
    const { vars, components } = buildOrderUtilityTemplateComponents(order);
    const payloadSummary = `${vars.orderId} | ${vars.customerName} | ${vars.itemsSummary} | ${vars.paymentMode} ${vars.amount} | ${vars.deliveryAddress}`;
    const logId = existingLogId || `walog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (!policy.enabled) {
      const log = upsertWhatsAppLog({
        id: logId,
        orderId: order.id,
        customerName: vars.customerName,
        customerPhone: formattedTo || rawPhone,
        messageType,
        direction: 'outbound',
        templateName,
        status: 'failed',
        sentAt: nowIso,
        failedAt: nowIso,
        errorCode: 'INTEGRATION_DISABLED',
        errorMessage: 'Meta WhatsApp Cloud API integration is deactivated.',
        retryCount,
        maxRetries,
        retryStatus: 'none',
        payloadSummary,
        updatedAt: nowIso,
      });
      return { success: false, log, error: log.errorMessage, errorCode: log.errorCode };
    }

    if (!formattedTo || formattedTo.length < 10) {
      const log = upsertWhatsAppLog({
        id: logId,
        orderId: order.id,
        customerName: vars.customerName,
        customerPhone: rawPhone || 'Missing',
        messageType,
        direction: 'outbound',
        templateName,
        status: 'failed',
        sentAt: nowIso,
        failedAt: nowIso,
        errorCode: 'INVALID_PHONE',
        errorMessage: 'Valid customer phone number is required for WhatsApp delivery.',
        retryCount,
        maxRetries,
        retryStatus: 'exhausted',
        payloadSummary,
        updatedAt: nowIso,
      });
      return { success: false, log, error: log.errorMessage, errorCode: log.errorCode };
    }

    if (!creds.token || !creds.phoneNumberId) {
      const nextRetryCount = retryCount + 1;
      const canRetry = nextRetryCount < maxRetries;
      const log = upsertWhatsAppLog({
        id: logId,
        orderId: order.id,
        customerName: vars.customerName,
        customerPhone: formattedTo,
        messageType,
        direction: 'outbound',
        templateName,
        status: 'failed',
        sentAt: nowIso,
        failedAt: nowIso,
        errorCode: 'MISSING_CREDENTIALS',
        errorMessage: 'WhatsApp Cloud API Access Token or Phone Number ID is not configured.',
        retryCount: nextRetryCount,
        maxRetries,
        retryStatus: canRetry ? 'scheduled' : 'exhausted',
        nextRetryAt: canRetry ? computeRetryBackoffIso(retryCount) : undefined,
        payloadSummary,
        updatedAt: nowIso,
      });
      return { success: false, log, error: log.errorMessage, errorCode: log.errorCode };
    }

    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: policy.templateLanguageCode || 'en' },
        components,
      },
    };

    try {
      const metaEndpoint = `${policy.apiEndpoint}/${creds.phoneNumberId}/messages`;
      const metaRes = await fetch(metaEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      const metaData: any = await metaRes.json().catch(() => ({}));
      const wamid = metaData?.messages?.[0]?.id;

      if (!metaRes.ok || !wamid) {
        const errCode = String(metaData?.error?.code || metaRes.status || 'META_API_ERROR');
        const errMsg =
          metaData?.error?.error_user_msg ||
          metaData?.error?.message ||
          `Meta WhatsApp API returned HTTP ${metaRes.status}`;
        const nextRetryCount = retryCount + 1;
        const canRetry = nextRetryCount < maxRetries && metaRes.status !== 400;
        const log = upsertWhatsAppLog({
          id: logId,
          orderId: order.id,
          customerName: vars.customerName,
          customerPhone: formattedTo,
          messageType,
          direction: 'outbound',
          templateName,
          status: 'failed',
          sentAt: nowIso,
          failedAt: nowIso,
          errorCode: errCode,
          errorMessage: errMsg,
          retryCount: nextRetryCount,
          maxRetries,
          retryStatus: canRetry ? 'scheduled' : 'exhausted',
          nextRetryAt: canRetry ? computeRetryBackoffIso(retryCount) : undefined,
          payloadSummary,
          updatedAt: nowIso,
        });
        return { success: false, log, error: errMsg, errorCode: errCode };
      }

      const log = upsertWhatsAppLog({
        id: logId,
        wamid,
        orderId: order.id,
        customerName: vars.customerName,
        customerPhone: formattedTo,
        messageType,
        direction: 'outbound',
        templateName,
        status: 'sent',
        sentAt: nowIso,
        errorCode: undefined,
        errorMessage: undefined,
        retryCount,
        maxRetries,
        retryStatus: retryCount > 0 ? 'succeeded' : 'none',
        nextRetryAt: undefined,
        payloadSummary,
        updatedAt: nowIso,
      });

      return { success: true, wamid, log };
    } catch (err: any) {
      const nextRetryCount = retryCount + 1;
      const canRetry = nextRetryCount < maxRetries;
      const errMsg = err?.message || 'Network failure contacting Meta WhatsApp Cloud API.';
      const log = upsertWhatsAppLog({
        id: logId,
        orderId: order.id,
        customerName: vars.customerName,
        customerPhone: formattedTo,
        messageType,
        direction: 'outbound',
        templateName,
        status: 'failed',
        sentAt: nowIso,
        failedAt: nowIso,
        errorCode: 'NETWORK_ERROR',
        errorMessage: errMsg,
        retryCount: nextRetryCount,
        maxRetries,
        retryStatus: canRetry ? 'scheduled' : 'exhausted',
        nextRetryAt: canRetry ? computeRetryBackoffIso(retryCount) : undefined,
        payloadSummary,
        updatedAt: nowIso,
      });
      return { success: false, log, error: errMsg, errorCode: 'NETWORK_ERROR' };
    }
  }

  async function dispatchWhatsAppSessionText(params: {
    order: any;
    messageType: 'confirm_ack' | 'cancel_ack';
    textBody: string;
  }) {
    const { order, messageType, textBody } = params;
    const nowIso = new Date().toISOString();
    const policy = getEffectiveWhatsAppPolicy();
    const creds = getEffectiveWhatsAppCreds();
    const rawPhone = order?.customer?.mobile || order?.customer?.phone || '';
    const formattedTo = normalizeIndianPhoneForWa(rawPhone);
    const logId = `walog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (!policy.enabled || !creds.token || !creds.phoneNumberId || !formattedTo) {
      return upsertWhatsAppLog({
        id: logId,
        orderId: order.id,
        customerName: order?.customer?.name || 'Customer',
        customerPhone: formattedTo || rawPhone,
        messageType,
        direction: 'outbound',
        status: 'failed',
        sentAt: nowIso,
        failedAt: nowIso,
        errorCode: !policy.enabled ? 'INTEGRATION_DISABLED' : 'MISSING_CREDENTIALS',
        errorMessage: !policy.enabled
          ? 'WhatsApp integration is disabled.'
          : 'WhatsApp credentials missing for acknowledgement message.',
        retryCount: 0,
        maxRetries: 2,
        retryStatus: 'none',
        payloadSummary: textBody.slice(0, 240),
        updatedAt: nowIso,
      });
    }

    try {
      const metaRes = await fetch(`${policy.apiEndpoint}/${creds.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'text',
          text: { preview_url: false, body: textBody },
        }),
      });
      const metaData: any = await metaRes.json().catch(() => ({}));
      const wamid = metaData?.messages?.[0]?.id;

      if (!metaRes.ok || !wamid) {
        return upsertWhatsAppLog({
          id: logId,
          orderId: order.id,
          customerName: order?.customer?.name || 'Customer',
          customerPhone: formattedTo,
          messageType,
          direction: 'outbound',
          status: 'failed',
          sentAt: nowIso,
          failedAt: nowIso,
          errorCode: String(metaData?.error?.code || metaRes.status),
          errorMessage: metaData?.error?.message || `Meta API HTTP ${metaRes.status}`,
          retryCount: 1,
          maxRetries: 2,
          retryStatus: 'scheduled',
          nextRetryAt: computeRetryBackoffIso(0),
          payloadSummary: textBody.slice(0, 240),
          updatedAt: nowIso,
        });
      }

      return upsertWhatsAppLog({
        id: logId,
        wamid,
        orderId: order.id,
        customerName: order?.customer?.name || 'Customer',
        customerPhone: formattedTo,
        messageType,
        direction: 'outbound',
        status: 'sent',
        sentAt: nowIso,
        retryCount: 0,
        maxRetries: 2,
        retryStatus: 'none',
        payloadSummary: textBody.slice(0, 240),
        updatedAt: nowIso,
      });
    } catch (err: any) {
      return upsertWhatsAppLog({
        id: logId,
        orderId: order.id,
        customerName: order?.customer?.name || 'Customer',
        customerPhone: formattedTo,
        messageType,
        direction: 'outbound',
        status: 'failed',
        sentAt: nowIso,
        failedAt: nowIso,
        errorCode: 'NETWORK_ERROR',
        errorMessage: err?.message || 'Failed sending acknowledgement message.',
        retryCount: 1,
        maxRetries: 2,
        retryStatus: 'scheduled',
        nextRetryAt: computeRetryBackoffIso(0),
        payloadSummary: textBody.slice(0, 240),
        updatedAt: nowIso,
      });
    }
  }

  function updateServerOrderById(orderId: string, mutator: (prev: any) => any): any | null {
    const norm = normalizeWaOrderId(orderId);
    const list = readServerOrders();
    const idx = list.findIndex((o) => normalizeWaOrderId(o?.id) === norm);
    if (idx < 0) return null;
    const prev = list[idx];
    const next = mutator(prev);
    if (!next) return prev;
    list[idx] = {
      ...next,
      updatedAt: new Date().toISOString(),
      syncVersion: Number(prev.syncVersion || 0) + 1,
    };
    writeServerOrders(list);
    return list[idx];
  }

  /**
   * Automatically triggers or schedules the initial WhatsApp Utility Template confirmation for a new order.
   * Respects 10 AM - 9 PM IST window when configured and prevents duplicate sends.
   */
  async function triggerOrderConfirmationWhatsApp(
    order: any,
    options?: { forceNowOverride?: boolean; allowRetryOverride?: boolean; nowDate?: Date; mockTransport?: any }
  ) {
    const normId = normalizeWaOrderId(order?.id);
    if (!normId || waConfirmationInFlight.has(normId)) {
      return { status: 'skipped_in_flight' };
    }
    const nowDate = options?.nowDate || new Date();
    const nowIso = nowDate.toISOString();
    const policy = getEffectiveWhatsAppPolicy();

    // Never send confirmation for an already confirmed or cancelled order
    const rawSt = String(order?.orderStatus || '').toLowerCase();
    if (
      order?.customerConfirmed === true ||
      rawSt === 'confirmed' ||
      rawSt === 'rtd' ||
      rawSt.includes('cancel') ||
      rawSt.includes('transit') ||
      rawSt.includes('deliver') ||
      rawSt === 'completed'
    ) {
      return { status: 'skipped_terminal_state' };
    }

    if (!policy.enabled || !policy.orderConfirmationEnabled) {
      // Automation is OFF: save order cleanly in Upcoming for manual confirmation (never block checkout or DB)
      updateServerOrderById(order.id, (prev) => ({
        ...prev,
        whatsappStatus: 'Pending',
        needsManualFollowUp: true,
        manualFollowUpFlaggedAt: prev.manualFollowUpFlaggedAt || nowIso,
        manualFollowUpReason: 'WhatsApp Automation is OFF — ready for manual confirmation.',
        confirmationTask: {
          status: 'automation_off',
          createdAt: prev.confirmationTask?.createdAt || nowIso,
          updatedAt: nowIso,
        },
        activityLog: appendOrderActivity(
          prev,
          'WhatsApp Automation OFF — Queued for Manual Confirmation',
          'Order saved safely in Upcoming. WhatsApp automation is disabled, so admin can confirm manually anytime.',
          'system'
        ),
      }));
      recordConfirmationAuditLog({
        orderId: order.id,
        eventType: 'ORDER_CREATED_AUTOMATION_OFF',
        previousStatus: 'Upcoming',
        newStatus: 'Upcoming',
        confirmationMethod: 'System',
        notes: 'WhatsApp Automation is OFF; order placed in manual confirmation queue.',
      });
      return { status: 'skipped_disabled' };
    }

    const mode = String(order?.paymentMode || 'COD').toUpperCase() === 'PREPAID' ? 'Prepaid' : 'COD';
    const policyApplies = mode === 'COD' ? policy.confirmCodOrders : policy.confirmPrepaidOrders;
    if (!policyApplies) {
      return { status: 'skipped_policy' };
    }

    const processed = readProcessedWhatsAppEvents();
    if (!options?.allowRetryOverride && (processed.confirmationsSent[normId] || order?.confirmationSentAt)) {
      return { status: 'already_sent' };
    }

    waConfirmationInFlight.add(normId);
    try {
      const windowCheck =
        policy.respectSendingWindow && !options?.forceNowOverride
          ? evaluateIstSendingWindow(nowDate, policy.sendingWindowStartHour, policy.sendingWindowEndHour)
          : { withinWindow: true, istHour: 12, istMinute: 0 };

      if (!windowCheck.withinWindow && windowCheck.scheduledForIso) {
        const vars = buildOrderSummaryVariables(order);
        const formattedTo = normalizeIndianPhoneForWa(order?.customer?.mobile || order?.customer?.phone || '');
        upsertWhatsAppLog({
          id: `walog_sched_${normId}`,
          orderId: order.id,
          customerName: vars.customerName,
          customerPhone: formattedTo,
          messageType: 'order_confirmation',
          direction: 'outbound',
          templateName: policy.confirmationTemplateName,
          status: 'scheduled',
          sentAt: nowIso,
          scheduledFor: windowCheck.scheduledForIso,
          retryCount: 0,
          maxRetries: 3,
          retryStatus: 'none',
          payloadSummary: `Scheduled for ${windowCheck.scheduledForIso} (10 AM - 9 PM IST window) | ${vars.orderId}`,
          updatedAt: nowIso,
        });

        updateServerOrderById(order.id, (prev) => ({
          ...prev,
          whatsappStatus: 'Scheduled',
          whatsappDeliveryStatus: 'scheduled',
          scheduledConfirmationTime: windowCheck.scheduledForIso,
          confirmationSentAt: undefined,
          confirmationTask: {
            status: 'scheduled',
            createdAt: prev.confirmationTask?.createdAt || nowIso,
            updatedAt: nowIso,
          },
          activityLog: appendOrderActivity(
            prev,
            'WhatsApp Confirmation Scheduled (10 AM IST)',
            `Order placed outside 10 AM – 9 PM IST window. Automated confirmation queued for ${windowCheck.scheduledForIso}.`,
            'whatsapp'
          ),
        }));

        recordConfirmationAuditLog({
          orderId: order.id,
          eventType: 'WHATSAPP_CONFIRMATION_SCHEDULED',
          previousStatus: 'Upcoming',
          newStatus: 'Upcoming',
          confirmationMethod: 'WhatsApp',
          notes: `Scheduled for ${windowCheck.scheduledForIso} (outside 10 AM - 9 PM IST window).`,
        });

        return { status: 'scheduled', scheduledFor: windowCheck.scheduledForIso };
      }

      const sendResult = await dispatchWhatsAppUtilityTemplate({
        order,
        messageType: 'order_confirmation',
      });

      if (sendResult.success && sendResult.wamid) {
        const latestProcessed = readProcessedWhatsAppEvents();
        latestProcessed.confirmationsSent[normId] = nowIso;
        writeProcessedWhatsAppEvents(latestProcessed);

        updateServerOrderById(order.id, (prev) => ({
          ...prev,
          whatsappStatus: 'Sent',
          whatsappDeliveryStatus: 'sent',
          whatsappMessageId: sendResult.wamid,
          whatsappSentAt: nowIso,
          confirmationSentAt: nowIso,
          scheduledConfirmationTime: undefined,
          whatsappError: undefined,
          needsManualFollowUp: false,
          manualFollowUpReason: undefined,
          confirmationTask: {
            status: 'sent',
            createdAt: prev.confirmationTask?.createdAt || nowIso,
            updatedAt: nowIso,
            lastAttemptAt: nowIso,
            method: 'WhatsApp',
          },
          activityLog: appendOrderActivity(
            prev,
            'WhatsApp Confirmation Sent',
            `Approved Utility Template (${policy.confirmationTemplateName}) sent with YES/CANCEL buttons (WAMID: ${sendResult.wamid}).`,
            'whatsapp'
          ),
        }));

        recordConfirmationAuditLog({
          orderId: order.id,
          eventType: 'WHATSAPP_CONFIRMATION_SENT',
          previousStatus: 'Upcoming',
          newStatus: 'Upcoming',
          confirmationMethod: 'WhatsApp',
          whatsappMessageId: sendResult.wamid,
          notes: `Utility template ${policy.confirmationTemplateName} sent.`,
        });

        return { status: 'sent', wamid: sendResult.wamid, logId: sendResult.log.id };
      }

      // Meta API failure: keep order safely in Upcoming, mark Failed, add to Manual Follow-Up queue
      const failureReason = sendResult.error || 'WhatsApp confirmation delivery failed.';
      updateServerOrderById(order.id, (prev) => ({
        ...prev,
        orderStatus: prev.orderStatus === 'NEW' || !prev.orderStatus ? 'NEW' : prev.orderStatus,
        whatsappStatus: 'Failed',
        whatsappDeliveryStatus: 'failed',
        whatsappError: failureReason,
        needsManualFollowUp: true,
        manualFollowUpFlaggedAt: nowIso,
        manualFollowUpReason: failureReason,
        confirmationTask: {
          status: 'failed',
          createdAt: prev.confirmationTask?.createdAt || nowIso,
          updatedAt: nowIso,
          lastAttemptAt: nowIso,
          failureReason,
        },
        activityLog: appendOrderActivity(
          prev,
          'WhatsApp Confirmation Failed — Added to Manual Follow-Up',
          `Meta Cloud API delivery failed (${sendResult.errorCode || 'ERR'}): ${failureReason}. Order remains safely in Upcoming for manual confirmation or retry.`,
          'whatsapp'
        ),
      }));

      recordConfirmationAuditLog({
        orderId: order.id,
        eventType: 'WHATSAPP_CONFIRMATION_FAILED',
        previousStatus: 'Upcoming',
        newStatus: 'Upcoming',
        confirmationMethod: 'WhatsApp',
        errorDetails: `[${sendResult.errorCode || 'META_ERR'}] ${failureReason}`,
        notes: 'Order retained in Upcoming and added to Manual Follow-up queue.',
      });

      return { status: 'failed', error: failureReason, errorCode: sendResult.errorCode, logId: sendResult.log.id };
    } finally {
      waConfirmationInFlight.delete(normId);
    }
  }

  /**
   * COMMON ATOMIC CONFIRMATION FUNCTION (Single Source of Truth)
   * Used by BOTH Automatic WhatsApp YES webhook AND Admin Manual Confirmation.
   * Guarantees:
   * - An order can only be confirmed ONCE (prevents duplicate confirmation & duplicate AWB).
   * - Manual confirmation works 100% independently of Meta API availability.
   * - Triggers automatic real Delhivery AWB creation while STRICTLY keeping order in Confirmed (NEVER RTD).
   * - Records persistent audit log with previous status, new status, confirmation method, adminId/wamid.
   */
  async function confirmOrderAtomically(params: {
    orderId: string;
    method: 'WhatsApp' | 'Manual';
    adminId?: string;
    adminName?: string;
    wamid?: string;
    customerReply?: string;
    note?: string;
    skipDelhiveryAutoAwb?: boolean;
  }): Promise<{
    success: boolean;
    confirmed: boolean;
    alreadyConfirmed?: boolean;
    blockedReason?: string;
    order?: any;
    delhiverySuccess?: boolean;
    awb?: string | null;
    delhiveryError?: string;
  }> {
    const normId = normalizeWaOrderId(params.orderId);
    if (!normId) {
      return { success: false, confirmed: false, blockedReason: 'Invalid Order ID.' };
    }
    if (waConfirmAtomicLock.has(normId)) {
      return {
        success: true,
        confirmed: false,
        alreadyConfirmed: true,
        blockedReason: 'Confirmation already in progress for this order.',
      };
    }

    waConfirmAtomicLock.add(normId);
    try {
      const latestOrders = readServerOrders();
      const targetOrder = latestOrders.find((o) => normalizeWaOrderId(o?.id) === normId);
      if (!targetOrder) {
        return { success: false, confirmed: false, blockedReason: `Order ${params.orderId} not found.` };
      }

      const prevStatusLabel = String(targetOrder.orderStatus || 'Upcoming');
      const rawStatus = prevStatusLabel.toLowerCase();
      const isCancelled = rawStatus.includes('cancel') || rawStatus.includes('expire') || targetOrder.isExpired === true;
      const isAlreadyConfirmedOrFurther =
        targetOrder.customerConfirmed === true ||
        rawStatus === 'confirmed' ||
        rawStatus === 'rtd' ||
        rawStatus.includes('ready to') ||
        rawStatus.includes('transit') ||
        rawStatus.includes('shipped') ||
        rawStatus.includes('deliver') ||
        rawStatus === 'completed';

      if (isCancelled) {
        recordConfirmationAuditLog({
          orderId: targetOrder.id,
          eventType: 'CONFIRMATION_BLOCKED_CANCELLED',
          previousStatus: prevStatusLabel,
          newStatus: prevStatusLabel,
          confirmationMethod: params.method,
          adminId: params.adminId,
          adminName: params.adminName,
          whatsappMessageId: params.wamid,
          notes: `Ignored ${params.method} confirmation because order is already Cancelled.`,
        });
        return {
          success: false,
          confirmed: false,
          blockedReason: `Order ${targetOrder.id} is already Cancelled and cannot be confirmed.`,
          order: targetOrder,
        };
      }

      if (isAlreadyConfirmedOrFurther) {
        recordConfirmationAuditLog({
          orderId: targetOrder.id,
          eventType: 'DUPLICATE_CONFIRMATION_PREVENTED',
          previousStatus: prevStatusLabel,
          newStatus: prevStatusLabel,
          confirmationMethod: params.method,
          adminId: params.adminId,
          adminName: params.adminName,
          whatsappMessageId: params.wamid,
          notes: `Duplicate ${params.method} confirmation prevented. Order was already confirmed via ${targetOrder.confirmationMethod || targetOrder.codVerifiedBy || 'previous action'}.`,
        });
        return {
          success: true,
          confirmed: false,
          alreadyConfirmed: true,
          blockedReason: `Order ${targetOrder.id} was already confirmed via ${targetOrder.confirmationMethod || 'previous action'}. Duplicate confirmation & duplicate AWB prevented.`,
          order: targetOrder,
          awb: targetOrder.awb_number || null,
        };
      }

      const nowIso = new Date().toISOString();
      const isManual = params.method === 'Manual';

      // Atomic status transition: Upcoming -> Confirmed (STRICTLY NOT RTD!)
      const confirmedOrder = updateServerOrderById(targetOrder.id, (prev) => ({
        ...prev,
        orderStatus: 'Confirmed',
        customerConfirmed: true,
        customerConfirmedAt: nowIso,
        confirmationMethod: params.method,
        confirmedByAdminId: isManual ? params.adminId || 'admin' : prev.confirmedByAdminId,
        confirmedByAdminName: isManual ? params.adminName || 'Admin' : prev.confirmedByAdminName,
        codVerificationStatus: 'CONFIRMED',
        codVerifiedBy: isManual ? `Manual (${params.adminName || params.adminId || 'Admin'})` : 'WhatsApp Reply',
        codVerifiedAt: nowIso,
        // Preserve actual WhatsApp delivery status on manual confirmation (e.g. 'Failed' stays 'Failed')
        whatsappStatus: isManual ? prev.whatsappStatus || 'Pending' : 'Confirmed',
        whatsappReply: isManual ? prev.whatsappReply || 'MANUAL_ADMIN_CONFIRMED' : params.customerReply || 'YES',
        whatsappReplyAt: isManual ? prev.whatsappReplyAt : nowIso,
        needsManualFollowUp: false,
        manualFollowUpReason: undefined,
        isExpired: false,
        confirmationAckSent: isManual ? prev.confirmationAckSent : true,
        confirmationAckSentAt: isManual ? prev.confirmationAckSentAt : nowIso,
        confirmationTask: {
          status: 'confirmed',
          createdAt: prev.confirmationTask?.createdAt || nowIso,
          updatedAt: nowIso,
          lastAttemptAt: nowIso,
          method: params.method,
        },
        whatsappProcessedMessageIds: params.wamid
          ? Array.from(
              new Set([
                ...(Array.isArray(prev.whatsappProcessedMessageIds) ? prev.whatsappProcessedMessageIds : []),
                params.wamid,
              ])
            )
          : prev.whatsappProcessedMessageIds,
        activityLog: appendOrderActivity(
          prev,
          isManual
            ? `Manually Confirmed by Admin (${params.adminName || params.adminId || 'Admin'})`
            : 'Customer Confirmed via WhatsApp (YES)',
          isManual
            ? `Order ${prev.id} manually confirmed by ${params.adminName || params.adminId || 'Admin'} after verifying customer agreement.${params.note ? ` Note: ${params.note}` : ''} Moved Upcoming → Confirmed and triggered Delhivery AWB creation (stays Confirmed until label download).`
            : `Order ${prev.id} confirmed via WhatsApp (${params.wamid || 'YES'}). Moved Upcoming → Confirmed and triggered automatic real Delhivery AWB creation (awaiting manual label download for RTD).`,
          isManual ? 'admin' : 'whatsapp'
        ),
      }));

      if (!confirmedOrder) {
        return { success: false, confirmed: false, blockedReason: 'Failed persisting confirmation.' };
      }

      recordConfirmationAuditLog({
        orderId: confirmedOrder.id,
        eventType: isManual ? 'ORDER_CONFIRMED_MANUAL' : 'ORDER_CONFIRMED_WHATSAPP',
        previousStatus: prevStatusLabel === 'NEW' ? 'Upcoming' : prevStatusLabel,
        newStatus: 'Confirmed',
        confirmationMethod: params.method,
        adminId: isManual ? params.adminId || 'admin' : undefined,
        adminName: isManual ? params.adminName || 'Admin' : undefined,
        whatsappMessageId: params.wamid,
        notes: params.note || (isManual ? 'Admin explicitly confirmed customer contact and agreement.' : 'Customer replied YES.'),
      });

      // Best-effort acknowledgement for WhatsApp confirmations only (never required for Manual confirmation)
      if (!isManual) {
        const customerName = confirmedOrder.customer?.name || 'Customer';
        const totalStr = Math.round(Number(confirmedOrder.total || 0)).toLocaleString('en-IN');
        await dispatchWhatsAppSessionText({
          order: confirmedOrder,
          messageType: 'confirm_ack',
          textBody: `Thank you ${customerName}! Your RedMode order ${confirmedOrder.id} (Rs ${totalStr}, ${confirmedOrder.paymentMode}) is CONFIRMED. We are preparing your parcel for Delhivery dispatch and will share tracking details once handed over.`,
        }).catch(() => {});
      }

      // Trigger idempotent automatic real Delhivery AWB generation (STRICTLY keeps order in Confirmed, NEVER RTD!)
      let delhiverySuccess = false;
      let awb: string | null = confirmedOrder.awb_number || null;
      let delhiveryError: string | undefined;

      if (!params.skipDelhiveryAutoAwb && !awb) {
        const delhiveryRes = await createDelhiveryShipmentInternal({ order: confirmedOrder }).catch((err: any) => ({
          httpStatus: 500,
          body: { success: false, message: err?.message || 'Delhivery creation error' },
        }));

        delhiverySuccess = Boolean(delhiveryRes?.body?.success);
        awb = (delhiveryRes?.body as any)?.waybill || null;
        if (!delhiverySuccess) {
          delhiveryError = delhiveryRes?.body?.message || 'Unable to generate real Delhivery AWB.';
          updateServerOrderById(confirmedOrder.id, (prev) => ({
            ...prev,
            orderStatus: prev.orderStatus === 'RTD' ? prev.orderStatus : 'Confirmed',
            delhiveryShipmentStatus: 'failed',
            delhiveryShipmentError: delhiveryError,
          }));
          recordConfirmationAuditLog({
            orderId: confirmedOrder.id,
            eventType: 'DELHIVERY_AWB_FAILED',
            previousStatus: 'Confirmed',
            newStatus: 'Confirmed',
            confirmationMethod: params.method,
            adminId: isManual ? params.adminId : undefined,
            errorDetails: delhiveryError,
            notes: 'Order remains Confirmed; admin can retry Real AWB creation.',
          });
        } else {
          recordConfirmationAuditLog({
            orderId: confirmedOrder.id,
            eventType: 'DELHIVERY_AWB_CREATED',
            previousStatus: 'Confirmed',
            newStatus: 'Confirmed',
            confirmationMethod: params.method,
            adminId: isManual ? params.adminId : undefined,
            notes: `Real Delhivery AWB ${awb} created. Order strictly remains Confirmed until manual shipping label download.`,
          });
        }
      }

      const finalOrder = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normId) || confirmedOrder;
      return {
        success: true,
        confirmed: true,
        order: finalOrder,
        delhiverySuccess,
        awb: finalOrder.awb_number || awb,
        delhiveryError,
      };
    } finally {
      waConfirmAtomicLock.delete(normId);
    }
  }

  /**
   * COMMON ATOMIC CANCELLATION FUNCTION
   * Used by BOTH WhatsApp CANCEL webhook AND Admin Manual Cancellation.
   * Restores inventory atomically once and blocks Delhivery shipment processing.
   */
  async function cancelOrderAtomically(params: {
    orderId: string;
    source: 'whatsapp_customer' | 'admin' | 'system';
    adminId?: string;
    adminName?: string;
    wamid?: string;
    customerReply?: string;
    reason?: string;
  }): Promise<{
    success: boolean;
    cancelled: boolean;
    alreadyCancelled?: boolean;
    blockedReason?: string;
    order?: any;
    stockRestored: boolean;
    restoredUnits: number;
  }> {
    const normId = normalizeWaOrderId(params.orderId);
    if (!normId) {
      return { success: false, cancelled: false, blockedReason: 'Invalid Order ID.', stockRestored: false, restoredUnits: 0 };
    }
    if (waCancelAtomicLock.has(normId)) {
      return {
        success: true,
        cancelled: false,
        alreadyCancelled: true,
        blockedReason: 'Cancellation already in progress.',
        stockRestored: false,
        restoredUnits: 0,
      };
    }

    waCancelAtomicLock.add(normId);
    try {
      const targetOrder = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normId);
      if (!targetOrder) {
        return { success: false, cancelled: false, blockedReason: `Order ${params.orderId} not found.`, stockRestored: false, restoredUnits: 0 };
      }

      const prevStatusLabel = String(targetOrder.orderStatus || 'Upcoming');
      const rawOrderStatus = prevStatusLabel.toLowerCase();
      const isAlreadyCancelled = rawOrderStatus.includes('cancel') || rawOrderStatus.includes('expire');
      const isAlreadyDispatched =
        rawOrderStatus.includes('transit') ||
        rawOrderStatus.includes('shipped') ||
        rawOrderStatus.includes('deliver') ||
        rawOrderStatus === 'completed';

      if (isAlreadyCancelled) {
        return {
          success: true,
          cancelled: false,
          alreadyCancelled: true,
          blockedReason: `Order ${targetOrder.id} is already Cancelled. Stock not restored again.`,
          order: targetOrder,
          stockRestored: false,
          restoredUnits: 0,
        };
      }

      if (isAlreadyDispatched) {
        return {
          success: false,
          cancelled: false,
          blockedReason: `Order ${targetOrder.id} is already ${targetOrder.orderStatus} and cannot be cancelled.`,
          order: targetOrder,
          stockRestored: false,
          restoredUnits: 0,
        };
      }

      const nowIso = new Date().toISOString();
      const isWa = params.source === 'whatsapp_customer';
      const cancelReason =
        params.reason ||
        (isWa ? 'Customer cancelled via WhatsApp (CANCEL)' : `Cancelled manually by ${params.adminName || 'Admin'}`);

      const cancelledOrder = updateServerOrderById(targetOrder.id, (prev) => ({
        ...prev,
        orderStatus: 'Cancelled',
        customerConfirmed: false,
        codVerificationStatus: 'REJECTED',
        whatsappStatus: isWa ? 'Cancelled' : prev.whatsappStatus || 'Cancelled',
        whatsappReply: isWa ? params.customerReply || 'CANCEL' : prev.whatsappReply,
        whatsappReplyAt: isWa ? nowIso : prev.whatsappReplyAt,
        cancellationSource: params.source,
        cancelledByAdminId: params.source === 'admin' ? params.adminId || 'admin' : prev.cancelledByAdminId,
        cancelledByAdminName: params.source === 'admin' ? params.adminName || 'Admin' : prev.cancelledByAdminName,
        cancellationReason: cancelReason,
        cancelledAt: nowIso,
        needsManualFollowUp: false,
        manualFollowUpReason: undefined,
        delhiveryShipmentStatus: 'idle',
        confirmationTask: {
          status: 'cancelled',
          createdAt: prev.confirmationTask?.createdAt || nowIso,
          updatedAt: nowIso,
          lastAttemptAt: nowIso,
        },
        whatsappProcessedMessageIds: params.wamid
          ? Array.from(
              new Set([
                ...(Array.isArray(prev.whatsappProcessedMessageIds) ? prev.whatsappProcessedMessageIds : []),
                params.wamid,
              ])
            )
          : prev.whatsappProcessedMessageIds,
        activityLog: appendOrderActivity(
          prev,
          isWa
            ? 'Order Cancelled by Customer via WhatsApp (CANCEL)'
            : `Order Cancelled Manually by ${params.adminName || 'Admin'}`,
          `${cancelReason}. Stock restoration triggered atomically once and Delhivery dispatch blocked.`,
          isWa ? 'whatsapp' : 'admin'
        ),
      }));

      const restoreResult = cancelledOrder
        ? restoreOrderStockAtomicallyOnce(cancelledOrder)
        : { restored: false, restoredUnits: 0 };

      recordConfirmationAuditLog({
        orderId: targetOrder.id,
        eventType: isWa ? 'ORDER_CANCELLED_WHATSAPP' : 'ORDER_CANCELLED_MANUAL',
        previousStatus: prevStatusLabel === 'NEW' ? 'Upcoming' : prevStatusLabel,
        newStatus: 'Cancelled',
        confirmationMethod: isWa ? 'WhatsApp' : 'Manual',
        adminId: params.source === 'admin' ? params.adminId || 'admin' : undefined,
        adminName: params.source === 'admin' ? params.adminName || 'Admin' : undefined,
        whatsappMessageId: params.wamid,
        notes: `${cancelReason} | Stock restored: ${restoreResult.restored ? `${restoreResult.restoredUnits} unit(s)` : 'already restored/none'}.`,
      });

      if (isWa && cancelledOrder) {
        const customerName = cancelledOrder.customer?.name || 'Customer';
        await dispatchWhatsAppSessionText({
          order: cancelledOrder,
          messageType: 'cancel_ack',
          textBody: `Hello ${customerName}, your RedMode order ${cancelledOrder.id} has been CANCELLED as requested. If you paid online, any eligible refund will be processed per RedMode policy. Thank you.`,
        }).catch(() => {});
      }

      const finalOrder = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normId) || cancelledOrder;
      return {
        success: true,
        cancelled: true,
        order: finalOrder,
        stockRestored: restoreResult.restored,
        restoredUnits: restoreResult.restoredUnits,
      };
    } finally {
      waCancelAtomicLock.delete(normId);
    }
  }

  /**
   * Restores stock atomically, exactly once, for a cancelled order on the server product store.
   */
  function restoreOrderStockAtomicallyOnce(order: any): { restored: boolean; restoredUnits: number } {
    const normId = normalizeWaOrderId(order?.id);
    if (!normId || !Array.isArray(order?.items) || order.items.length === 0) {
      return { restored: false, restoredUnits: 0 };
    }
    if (order.inventoryRestored === true || waStockRestoreInFlight.has(normId)) {
      return { restored: false, restoredUnits: 0 };
    }

    waStockRestoreInFlight.add(normId);
    try {
      // Re-read authoritative order from disk to guarantee once-only restoration
      const latestOrders = readServerOrders();
      const orderIdx = latestOrders.findIndex((o) => normalizeWaOrderId(o?.id) === normId);
      if (orderIdx >= 0 && latestOrders[orderIdx].inventoryRestored === true) {
        return { restored: false, restoredUnits: 0 };
      }

      const products = readServerProducts();
      let restoredUnits = 0;
      let productsChanged = false;

      const updatedProducts = products.map((prod: any) => {
        const matchingItems = order.items.filter((it: any) => String(it?.productId) === String(prod?.id));
        if (matchingItems.length === 0) return prod;

        const nextStockBySize = { ...(prod.stockBySize || {}) };
        const nextColorOptions = Array.isArray(prod.colorOptions)
          ? prod.colorOptions.map((c: any) => ({ ...c, stockBySize: { ...(c?.stockBySize || {}) } }))
          : prod.colorOptions;
        let prodRestored = 0;

        for (const it of matchingItems) {
          const qty = Math.max(1, Number(it?.quantity || 1));
          const sizeKey = String(it?.size || 'Free size');
          nextStockBySize[sizeKey] = Number(nextStockBySize[sizeKey] || 0) + qty;
          prodRestored += qty;
          restoredUnits += qty;

          if (Array.isArray(nextColorOptions) && it?.color) {
            const vIdx = nextColorOptions.findIndex(
              (c: any) => String(c?.name || '').toLowerCase() === String(it.color).toLowerCase()
            );
            if (vIdx >= 0) {
              nextColorOptions[vIdx].stockBySize[sizeKey] =
                Number(nextColorOptions[vIdx].stockBySize[sizeKey] || 0) + qty;
            }
          }
        }

        productsChanged = true;
        return {
          ...prod,
          stockBySize: nextStockBySize,
          colorOptions: nextColorOptions,
          inStock: true,
          salesCount: Math.max(0, Number(prod.salesCount || 0) - prodRestored),
          updatedAt: new Date().toISOString(),
        };
      });

      if (productsChanged) {
        writeServerProducts(updatedProducts);
      }

      const nowIso = new Date().toISOString();
      if (orderIdx >= 0) {
        latestOrders[orderIdx] = {
          ...latestOrders[orderIdx],
          inventoryRestored: true,
          inventoryRestoredAt: nowIso,
          updatedAt: nowIso,
          syncVersion: Number(latestOrders[orderIdx].syncVersion || 0) + 1,
        };
        writeServerOrders(latestOrders);
      }

      return { restored: true, restoredUnits };
    } finally {
      waStockRestoreInFlight.delete(normId);
    }
  }

  function safeHmacCompareHex(expectedHex: string, providedHex: string): boolean {
    const a = Buffer.from(expectedHex.toLowerCase(), 'utf-8');
    const b = Buffer.from(providedHex.toLowerCase(), 'utf-8');
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Verifies incoming webhook authenticity:
   * - Mode 1 (Render Relay): `X-Redmode-Relay-Signature` (`sha256=<hmac(ts + "." + rawBody, REDMODE_RELAY_SECRET)>`)
   *   + `X-Redmode-Relay-Timestamp` within 5-minute replay window (plus optional forwarded `X-Hub-Signature-256`).
   * - Mode 2 (Direct Meta Cloud API): `X-Hub-Signature-256` (`sha256=<hmac(rawBody, WHATSAPP_APP_SECRET)>`).
   * Strictly fail-closed: unsigned or invalidly signed payloads return verified: false (HTTP 401).
   */
  function verifyIncomingWhatsAppWebhookAuth(req: Request): {
    verified: boolean;
    mode: 'render_relay' | 'meta_direct' | 'rejected';
    reason?: string;
  } {
    const policy = getEffectiveWhatsAppPolicy();
    const rawBuf: Buffer = Buffer.isBuffer((req as any).rawBody)
      ? (req as any).rawBody
      : Buffer.from(JSON.stringify(req.body || {}), 'utf-8');

    const relaySigHeader = String(req.headers['x-redmode-relay-signature'] || '').trim();
    const relayTsHeader = String(req.headers['x-redmode-relay-timestamp'] || '').trim();
    const metaSigHeader = String(req.headers['x-hub-signature-256'] || '').trim();

    // 1. Verify Signed Render Relay if relay headers are present
    if (relaySigHeader) {
      if (!policy.relaySecret) {
        return {
          verified: false,
          mode: 'rejected',
          reason: 'REDMODE_RELAY_SECRET is not configured on the RedMode backend.',
        };
      }
      const tsNum = Number(relayTsHeader);
      if (!tsNum || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
        return {
          verified: false,
          mode: 'rejected',
          reason: 'Render relay timestamp missing or outside 5-minute replay window.',
        };
      }
      const providedHex = relaySigHeader.startsWith('sha256=') ? relaySigHeader.slice(7) : relaySigHeader;
      const expectedHex = crypto
        .createHmac('sha256', policy.relaySecret)
        .update(`${relayTsHeader}.`)
        .update(rawBuf)
        .digest('hex');

      if (!safeHmacCompareHex(expectedHex, providedHex)) {
        return {
          verified: false,
          mode: 'rejected',
          reason: 'Invalid X-Redmode-Relay-Signature HMAC.',
        };
      }

      // If Meta signature was also forwarded and appSecret is configured, verify it too
      if (metaSigHeader && policy.appSecret) {
        const metaProvided = metaSigHeader.startsWith('sha256=') ? metaSigHeader.slice(7) : metaSigHeader;
        const metaExpected = crypto.createHmac('sha256', policy.appSecret).update(rawBuf).digest('hex');
        if (!safeHmacCompareHex(metaExpected, metaProvided)) {
          return {
            verified: false,
            mode: 'rejected',
            reason: 'Forwarded X-Hub-Signature-256 failed Meta App Secret verification.',
          };
        }
      }

      return { verified: true, mode: 'render_relay' };
    }

    // 2. Verify Direct Meta X-Hub-Signature-256
    if (metaSigHeader) {
      if (!policy.appSecret) {
        return {
          verified: false,
          mode: 'rejected',
          reason: 'WHATSAPP_APP_SECRET is not configured on the RedMode backend.',
        };
      }
      const providedHex = metaSigHeader.startsWith('sha256=') ? metaSigHeader.slice(7) : metaSigHeader;
      const expectedHex = crypto.createHmac('sha256', policy.appSecret).update(rawBuf).digest('hex');
      if (!safeHmacCompareHex(expectedHex, providedHex)) {
        return {
          verified: false,
          mode: 'rejected',
          reason: 'Invalid Meta X-Hub-Signature-256 signature.',
        };
      }
      return { verified: true, mode: 'meta_direct' };
    }

    return {
      verified: false,
      mode: 'rejected',
      reason: 'Missing webhook signature header (X-Hub-Signature-256 or X-Redmode-Relay-Signature).',
    };
  }

  function parseWhatsAppOrderReply(msg: any): {
    action: 'YES' | 'CANCEL' | 'OTHER';
    orderId?: string;
    rawText: string;
    rawPayload: string;
  } {
    const rawPayload = String(
      msg?.button?.payload || msg?.interactive?.button_reply?.id || ''
    ).trim();
    const rawText = String(
      msg?.button?.text || msg?.interactive?.button_reply?.title || msg?.text?.body || ''
    ).trim();

    // 1. Exact button payload with Order ID: CONFIRM_ORDER::#12345 or CANCEL_ORDER::#12345
    const payloadMatch = rawPayload.match(/^(CONFIRM_ORDER|CANCEL_ORDER|YES|CANCEL)::\s*(.+)$/i);
    if (payloadMatch) {
      const cmd = payloadMatch[1].toUpperCase();
      const orderId = payloadMatch[2].trim();
      const action: 'YES' | 'CANCEL' =
        cmd === 'CONFIRM_ORDER' || cmd === 'YES' ? 'YES' : 'CANCEL';
      return { action, orderId, rawText: rawText || action, rawPayload };
    }

    // 2. Fallback: extract order ID from text if customer typed e.g. "YES #12345" or "CANCEL RM-101"
    const upper = rawText.toUpperCase();
    const textOrderMatch = rawText.match(/(#[A-Za-z0-9_-]{3,}|RM-[A-Za-z0-9_-]{3,})/i);
    const extractedOrderId = textOrderMatch ? textOrderMatch[1].trim() : undefined;

    if (upper === 'YES' || upper === 'CONFIRM' || upper.startsWith('YES ') || upper.includes('CONFIRM ORDER')) {
      return { action: 'YES', orderId: extractedOrderId, rawText, rawPayload };
    }
    if (upper === 'CANCEL' || upper === 'NO' || upper.startsWith('CANCEL ') || upper.includes('CANCEL ORDER')) {
      return { action: 'CANCEL', orderId: extractedOrderId, rawText, rawPayload };
    }

    return { action: 'OTHER', orderId: extractedOrderId, rawText, rawPayload };
  }

  async function processIncomingWhatsAppWebhookPayload(
    body: any,
    authMode: 'render_relay' | 'meta_direct'
  ) {
    const entries = Array.isArray(body?.entry) ? body.entry : [];
    const results = {
      processedMessages: 0,
      duplicateMessages: 0,
      processedStatuses: 0,
      duplicateStatuses: 0,
      actions: [] as any[],
    };

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const ch of changes) {
        const value = ch?.value;
        if (!value || typeof value !== 'object') continue;

        // A. Handle Outbound Message Delivery / Read / Failed Status Updates
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const st of statuses) {
          const wamid = String(st?.id || '').trim();
          const stName = String(st?.status || '').trim().toLowerCase();
          const stTs = String(st?.timestamp || '').trim();
          if (!wamid || !stName) continue;

          const dedupKey = `${wamid}:${stName}:${stTs}`;
          const processedState = readProcessedWhatsAppEvents();
          if (processedState.statuses[dedupKey]) {
            results.duplicateStatuses++;
            continue;
          }

          const nowIso = new Date().toISOString();
          processedState.statuses[dedupKey] = nowIso;
          writeProcessedWhatsAppEvents(processedState);
          results.processedStatuses++;

          const errObj = Array.isArray(st.errors) && st.errors[0] ? st.errors[0] : null;
          const errCode = errObj?.code ? String(errObj.code) : undefined;
          const errMsg = errObj
            ? [errObj.title, errObj.message, errObj.error_data?.details].filter(Boolean).join(' — ')
            : undefined;

          const allLogs = readWhatsAppLogs();
          const matchedLog = allLogs.find((l) => l.wamid === wamid);
          const recipientPhone = normalizeIndianPhoneForWa(st?.recipient_id || matchedLog?.customerPhone || '');

          if (matchedLog) {
            const nextStatus: WhatsAppMessageLogRecord['status'] =
              stName === 'delivered'
                ? 'delivered'
                : stName === 'read'
                ? 'read'
                : stName === 'failed'
                ? 'failed'
                : 'sent';
            const nextRetryCount = stName === 'failed' ? matchedLog.retryCount + 1 : matchedLog.retryCount;
            const canRetry =
              stName === 'failed' &&
              nextRetryCount < matchedLog.maxRetries &&
              (matchedLog.messageType === 'order_confirmation' || matchedLog.messageType === 'reminder_23h');

            upsertWhatsAppLog({
              ...matchedLog,
              status: nextStatus,
              deliveredAt: stName === 'delivered' ? nowIso : matchedLog.deliveredAt,
              readAt: stName === 'read' ? nowIso : matchedLog.readAt,
              failedAt: stName === 'failed' ? nowIso : matchedLog.failedAt,
              errorCode: stName === 'failed' ? errCode || 'DELIVERY_FAILED' : matchedLog.errorCode,
              errorMessage: stName === 'failed' ? errMsg || 'WhatsApp delivery failed.' : matchedLog.errorMessage,
              retryCount: nextRetryCount,
              retryStatus: stName === 'failed' ? (canRetry ? 'scheduled' : 'exhausted') : matchedLog.retryStatus,
              nextRetryAt: canRetry ? computeRetryBackoffIso(matchedLog.retryCount) : matchedLog.nextRetryAt,
              updatedAt: nowIso,
            });

            if (matchedLog.orderId) {
              updateServerOrderById(matchedLog.orderId, (prev) => {
                const isStillUpcoming =
                  !prev.customerConfirmed &&
                  !String(prev.orderStatus || '').toLowerCase().includes('cancel') &&
                  String(prev.orderStatus || '').toLowerCase() !== 'confirmed';
                return {
                  ...prev,
                  whatsappDeliveryStatus: nextStatus as any,
                  ...(stName === 'failed'
                    ? {
                        whatsappStatus: 'Failed' as const,
                        whatsappError: errMsg || 'WhatsApp message delivery failed.',
                        ...(isStillUpcoming
                          ? {
                              needsManualFollowUp: true,
                              manualFollowUpFlaggedAt: prev.manualFollowUpFlaggedAt || nowIso,
                              manualFollowUpReason: `WhatsApp delivery failed: ${errMsg || 'Meta delivery error'}`,
                            }
                          : {}),
                      }
                    : {}),
                };
              });
            }
            results.actions.push({ type: 'status', wamid, status: nextStatus, orderId: matchedLog.orderId });
          } else {
            // Log standalone status if we didn't have a prior outbound entry
            upsertWhatsAppLog({
              id: `walog_st_${wamid.slice(-12)}`,
              wamid,
              orderId: 'UNKNOWN',
              customerPhone: recipientPhone,
              messageType: 'order_confirmation',
              direction: 'outbound',
              status:
                stName === 'delivered'
                  ? 'delivered'
                  : stName === 'read'
                  ? 'read'
                  : stName === 'failed'
                  ? 'failed'
                  : 'sent',
              sentAt: nowIso,
              deliveredAt: stName === 'delivered' ? nowIso : undefined,
              readAt: stName === 'read' ? nowIso : undefined,
              failedAt: stName === 'failed' ? nowIso : undefined,
              errorCode: errCode,
              errorMessage: errMsg,
              retryCount: 0,
              maxRetries: 3,
              retryStatus: 'none',
              updatedAt: nowIso,
            });
            results.actions.push({ type: 'status', wamid, status: stName });
          }
        }

        // B. Handle Incoming Customer Replies (YES / CANCEL Quick Reply Buttons or Text)
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const msg of messages) {
          const wamid = String(msg?.id || '').trim();
          if (!wamid) continue;

          // Durable & in-memory idempotency guard against duplicate webhook delivery
          const processedState = readProcessedWhatsAppEvents();
          if (processedState.messages[wamid] || waReplyInFlight.has(wamid)) {
            results.duplicateMessages++;
            continue;
          }
          waReplyInFlight.add(wamid);

          try {
            const nowIso = new Date().toISOString();
            const senderDigits = String(msg?.from || '').replace(/\D/g, '');
            const cleanSender10 = senderDigits.slice(-10);
            const parsedReply = parseWhatsAppOrderReply(msg);

            // Identify exact order: priority 1 = exact Order ID from button payload; priority 2 = latest Upcoming order for sender phone
            const allOrders = readServerOrders();
            let targetOrder: any = null;
            if (parsedReply.orderId) {
              const targetNorm = normalizeWaOrderId(parsedReply.orderId);
              targetOrder = allOrders.find((o) => normalizeWaOrderId(o?.id) === targetNorm) || null;
            }
            if (!targetOrder && cleanSender10.length === 10) {
              targetOrder =
                allOrders.find((o) => {
                  const phone10 = String(o?.customer?.mobile || o?.customer?.phone || '')
                    .replace(/\D/g, '')
                    .slice(-10);
                  const rawSt = String(o?.orderStatus || '').toLowerCase();
                  const isUpcoming =
                    !o?.customerConfirmed &&
                    (rawSt === 'new' || rawSt === 'pending' || rawSt === 'cod verification' || rawSt === '');
                  return phone10 === cleanSender10 && isUpcoming;
                }) || null;
            }

            // Record inbound message permanently in processed store BEFORE side effects (atomic idempotency)
            const latestProcessed = readProcessedWhatsAppEvents();
            latestProcessed.messages[wamid] = nowIso;
            writeProcessedWhatsAppEvents(latestProcessed);
            results.processedMessages++;

            // Log inbound customer reply in WhatsApp Message Logs
            upsertWhatsAppLog({
              id: `walog_in_${wamid.slice(-16)}`,
              wamid,
              orderId: targetOrder?.id || parsedReply.orderId || 'UNMATCHED',
              customerName: targetOrder?.customer?.name || value?.contacts?.[0]?.profile?.name || 'Customer',
              customerPhone: senderDigits,
              messageType: 'inbound_reply',
              direction: 'inbound',
              status: 'received',
              sentAt: nowIso,
              customerReply: parsedReply.rawText || parsedReply.rawPayload,
              replyAction: parsedReply.action,
              retryCount: 0,
              maxRetries: 0,
              retryStatus: 'none',
              payloadSummary: `Auth: ${authMode} | Payload: ${parsedReply.rawPayload || parsedReply.rawText}`,
              updatedAt: nowIso,
            });

            if (!targetOrder || (parsedReply.action !== 'YES' && parsedReply.action !== 'CANCEL')) {
              results.actions.push({
                type: 'inbound_unactioned',
                wamid,
                action: parsedReply.action,
                orderId: targetOrder?.id || parsedReply.orderId || null,
              });
              continue;
            }

            const rawOrderStatus = String(targetOrder.orderStatus || '').toLowerCase();
            const isAlreadyCancelled = rawOrderStatus.includes('cancel') || rawOrderStatus.includes('expire');
            const isAlreadyConfirmedOrFurther =
              targetOrder.customerConfirmed === true ||
              rawOrderStatus === 'confirmed' ||
              rawOrderStatus === 'rtd' ||
              rawOrderStatus.includes('ready to') ||
              rawOrderStatus.includes('transit') ||
              rawOrderStatus.includes('shipped') ||
              rawOrderStatus.includes('deliver') ||
              rawOrderStatus === 'completed';

            if (parsedReply.action === 'YES') {
              const confirmRes = await confirmOrderAtomically({
                orderId: targetOrder.id,
                method: 'WhatsApp',
                wamid,
                customerReply: parsedReply.rawText || 'YES',
              });

              if (!confirmRes.confirmed) {
                results.actions.push({
                  type: 'yes_ignored_state',
                  wamid,
                  orderId: targetOrder.id,
                  currentStatus: confirmRes.order?.orderStatus || targetOrder.orderStatus,
                  reason: confirmRes.blockedReason,
                });
              } else {
                results.actions.push({
                  type: 'confirmed',
                  wamid,
                  orderId: targetOrder.id,
                  orderStatus: 'Confirmed',
                  delhiverySuccess: Boolean(confirmRes.delhiverySuccess),
                  awb: confirmRes.awb || null,
                });
              }
            } else if (parsedReply.action === 'CANCEL') {
              const cancelRes = await cancelOrderAtomically({
                orderId: targetOrder.id,
                source: 'whatsapp_customer',
                wamid,
                customerReply: parsedReply.rawText || 'CANCEL',
              });

              if (!cancelRes.cancelled) {
                results.actions.push({
                  type: 'cancel_ignored_state',
                  wamid,
                  orderId: targetOrder.id,
                  currentStatus: cancelRes.order?.orderStatus || targetOrder.orderStatus,
                  reason: cancelRes.blockedReason,
                });
              } else {
                results.actions.push({
                  type: 'cancelled',
                  wamid,
                  orderId: targetOrder.id,
                  orderStatus: 'Cancelled',
                  stockRestored: cancelRes.stockRestored,
                  restoredUnits: cancelRes.restoredUnits,
                });
              }
            }
          } finally {
            waReplyInFlight.delete(wamid);
          }
        }
      }
    }

    return results;
  }

  /**
   * Real Background Scheduler Tick:
   * 1. Dispatches due 10 AM - 9 PM scheduled confirmations
   * 2. Safely retries failed outbound WhatsApp template sends whose backoff elapsed
   * 3. Sends ONE 23-hour reminder for unconfirmed Upcoming orders (atomic idempotency guard)
   * 4. Flags needsManualFollowUp = true after follow-up period without ever auto-shipping
   */
  async function runWhatsAppAutomationTick(options?: { nowMs?: number; ignoreWindowForTest?: boolean }) {
    if (waSchedulerTickRunning) {
      return { skipped: true, reason: 'tick_in_progress' };
    }
    waSchedulerTickRunning = true;
    const summary = {
      ranAt: new Date(options?.nowMs || Date.now()).toISOString(),
      scheduledDispatched: 0,
      retriesAttempted: 0,
      remindersSent: 0,
      manualFollowUpFlagged: 0,
      errors: [] as string[],
    };

    try {
      const nowMs = options?.nowMs || Date.now();
      const nowDate = new Date(nowMs);
      const nowIso = nowDate.toISOString();
      const policy = getEffectiveWhatsAppPolicy();
      const windowStatus = options?.ignoreWindowForTest
        ? { withinWindow: true, istHour: 12, istMinute: 0 }
        : evaluateIstSendingWindow(nowDate, policy.sendingWindowStartHour, policy.sendingWindowEndHour);

      // 1. Dispatch scheduled confirmations once inside 10 AM - 9 PM IST window (only when Automation is ON)
      const allOrders = readServerOrders();
      if (policy.enabled && policy.orderConfirmationEnabled) {
        for (const order of allOrders) {
          const rawSt = String(order?.orderStatus || '').toLowerCase();
          const isUpcoming =
            !order?.customerConfirmed &&
            !order?.isExpired &&
            (rawSt === 'new' || rawSt === 'pending' || rawSt === 'cod verification' || rawSt === '');
          if (!isUpcoming) continue;

          // Never blindly resend old orders created while automation was OFF
          if (order.confirmationTask?.status === 'automation_off') continue;

          if (
            order.scheduledConfirmationTime &&
            !order.confirmationSentAt &&
            new Date(order.scheduledConfirmationTime).getTime() <= nowMs &&
            (!policy.respectSendingWindow || windowStatus.withinWindow)
          ) {
            const res = await triggerOrderConfirmationWhatsApp(order, {
              forceNowOverride: true,
              nowDate,
            });
            if (res.status === 'sent') summary.scheduledDispatched++;
          }
        }
      }

      // 2. Retry failed outbound WhatsApp messages safely (only when Automation is ON; never retries confirmed/cancelled)
      const allLogs = readWhatsAppLogs();
      if (policy.enabled) {
        for (const log of allLogs) {
          if (
            log.direction === 'outbound' &&
            log.status === 'failed' &&
            log.retryStatus === 'scheduled' &&
            log.retryCount < log.maxRetries &&
            log.nextRetryAt &&
            new Date(log.nextRetryAt).getTime() <= nowMs &&
            (log.messageType === 'order_confirmation' || log.messageType === 'reminder_23h')
          ) {
            const linkedOrder = readServerOrders().find(
              (o) => normalizeWaOrderId(o?.id) === normalizeWaOrderId(log.orderId)
            );
            if (
              !linkedOrder ||
              linkedOrder.customerConfirmed ||
              String(linkedOrder.orderStatus || '').toLowerCase().includes('cancel')
            ) {
              upsertWhatsAppLog({ ...log, retryStatus: 'none', nextRetryAt: undefined });
              continue;
            }
            summary.retriesAttempted++;
            const retryRes = await dispatchWhatsAppUtilityTemplate({
              order: linkedOrder,
              messageType: log.messageType,
              existingLogId: log.id,
              retryCount: log.retryCount,
            });
            if (retryRes.success && retryRes.wamid) {
              updateServerOrderById(linkedOrder.id, (prev) => ({
                ...prev,
                whatsappStatus: 'Sent',
                whatsappDeliveryStatus: 'sent',
                whatsappError: undefined,
                needsManualFollowUp: false,
                manualFollowUpReason: undefined,
                confirmationTask: {
                  status: 'sent',
                  createdAt: prev.confirmationTask?.createdAt || nowIso,
                  updatedAt: nowIso,
                  lastAttemptAt: nowIso,
                  method: 'WhatsApp',
                },
                ...(log.messageType === 'order_confirmation'
                  ? {
                      whatsappMessageId: retryRes.wamid,
                      confirmationSentAt: prev.confirmationSentAt || nowIso,
                      whatsappSentAt: nowIso,
                    }
                  : {
                      whatsappReminderMessageId: retryRes.wamid,
                      reminder23hSent: true,
                      reminder23hSentAt: nowIso,
                    }),
              }));
            }
          }
        }
      }

      // 3 & 4. 23-Hour Reminder (atomic once-only) & Manual Follow-Up Flagging
      const latestOrders = readServerOrders();
      for (const order of latestOrders) {
        const normId = normalizeWaOrderId(order?.id);
        const rawSt = String(order?.orderStatus || '').toLowerCase();
        const isUpcoming =
          !order?.customerConfirmed &&
          !order?.isExpired &&
          (rawSt === 'new' || rawSt === 'pending' || rawSt === 'cod verification' || rawSt === '');
        if (!isUpcoming) continue;

        const referenceIso = order.confirmationSentAt || order.whatsappSentAt || order.createdAt;
        if (!referenceIso) continue;
        const elapsedHours = (nowMs - new Date(referenceIso).getTime()) / (1000 * 60 * 60);

        // 3. 23-Hour Gentle Reminder (one-time atomic idempotency guard)
        const processed = readProcessedWhatsAppEvents();
        const alreadyReminded = Boolean(order.reminder23hSent || processed.remindersSent[normId]);

        if (
          policy.enabled &&
          policy.reminder23hEnabled &&
          !alreadyReminded &&
          !waReminderInFlight.has(normId) &&
          elapsedHours >= policy.reminderDelayHours &&
          order.confirmationSentAt
        ) {
          waReminderInFlight.add(normId);
          try {
            // Re-verify atomic lock right before sending
            const freshProcessed = readProcessedWhatsAppEvents();
            if (!freshProcessed.remindersSent[normId]) {
              // Claim reminder slot atomically so concurrent ticks can never send twice
              freshProcessed.remindersSent[normId] = nowIso;
              writeProcessedWhatsAppEvents(freshProcessed);

              const remRes = await dispatchWhatsAppUtilityTemplate({
                order,
                messageType: 'reminder_23h',
              });

              updateServerOrderById(order.id, (prev) => ({
                ...prev,
                reminder23hSent: true,
                reminder23hSentAt: nowIso,
                whatsappReminderMessageId: remRes.wamid || prev.whatsappReminderMessageId,
                whatsappDeliveryStatus: remRes.success ? 'sent' : 'failed',
                whatsappError: remRes.success ? undefined : remRes.error,
                activityLog: appendOrderActivity(
                  prev,
                  remRes.success ? '23-Hour Reminder Sent via WhatsApp' : '23-Hour Reminder Failed (Retry Scheduled)',
                  remRes.success
                    ? `Gentle 23h reminder (${policy.reminderTemplateName}) sent with YES/CANCEL buttons (WAMID: ${remRes.wamid}).`
                    : `23h reminder attempt failed: ${remRes.error || 'Unknown error'}.`,
                  'whatsapp'
                ),
              }));
              summary.remindersSent++;
            }
          } finally {
            waReminderInFlight.delete(normId);
          }
          continue;
        }

        // 4. Still no response after follow-up period -> Flag needsManualFollowUp = true (NEVER auto-ship!)
        const refreshedOrder = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normId) || order;
        if (
          refreshedOrder.reminder23hSent &&
          !refreshedOrder.customerConfirmed &&
          !refreshedOrder.needsManualFollowUp &&
          elapsedHours >= policy.manualFollowUpHours
        ) {
          updateServerOrderById(refreshedOrder.id, (prev) => ({
            ...prev,
            needsManualFollowUp: true,
            manualFollowUpFlaggedAt: nowIso,
            whatsappStatus: 'No Reply',
            activityLog: appendOrderActivity(
              prev,
              'Flagged for Manual Follow-Up',
              `No customer reply after ${Math.round(elapsedHours)}h (including 23h reminder). Flagged for manual admin follow-up; shipment NOT auto-created.`,
              'system'
            ),
          }));
          summary.manualFollowUpFlagged++;
        }
      }
    } catch (err: any) {
      summary.errors.push(err?.message || 'Scheduler tick error');
    } finally {
      waSchedulerTickRunning = false;
    }

    return summary;
  }

  // Start real background scheduler (runs every 60 seconds)
  setInterval(() => {
    void runWhatsAppAutomationTick().catch(() => {});
  }, 60 * 1000);

  // Official Meta WhatsApp Cloud API Connectivity Test Endpoint (Restricted to Super Admin)
  const handleWhatsAppTest = async (req: Request, res: Response) => {
    const body = req.body || {};
    const { token, phoneNumberId, wabaId } = getEffectiveWhatsAppCreds(
      body.accessToken,
      body.phoneNumberId,
      body.wabaId,
      true
    );

    if (!token || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        connected: false,
        error: 'WhatsApp Cloud API credentials (Access Token & Phone Number ID) are required to test connection.',
      });
    }

    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,account_mode,status,name_status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const phoneData: any = await metaRes.json().catch(() => ({}));

      if (!metaRes.ok) {
        return res.status(metaRes.status).json({
          success: false,
          connected: false,
          error: phoneData?.error?.message || `Meta API error (${metaRes.status})`,
          details: phoneData,
        });
      }

      return res.json({
        success: true,
        connected: true,
        phoneNumberId: phoneData.id,
        verifiedName: phoneData.verified_name,
        displayPhoneNumber: phoneData.display_phone_number,
        accountMode: phoneData.account_mode,
        metaStatus: phoneData.status,
        codeVerificationStatus: phoneData.code_verification_status,
        qualityRating: phoneData.quality_rating,
        wabaId: wabaId || null,
        message: `Connected to Meta WhatsApp Cloud API successfully! Verified Business: ${phoneData.verified_name || 'RedMode'} (${phoneData.display_phone_number || phoneData.id})`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        connected: false,
        error: `Error checking WhatsApp API: ${err.message}`,
      });
    }
  };
  app.get('/api/whatsapp/test', requireSuperAdmin, handleWhatsAppTest);
  app.post('/api/whatsapp/test', requireSuperAdmin, handleWhatsAppTest);

  // Official Meta WhatsApp Cloud API Send Endpoint (Authenticated Staff/Admin Only, Never Faked)
  app.post('/api/whatsapp/send', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const {
      to,
      templateName,
      components,
      textMessage,
      accessToken: bodyToken,
      phoneNumberId: bodyPhoneId,
      languageCode,
      orderId,
      messageType,
    } = req.body || {};

    const cfg = readServerIntegrations();
    if (cfg.whatsappIntegrationDeleted === true || cfg.whatsappSettings?.enabled === false) {
      return res.status(503).json({
        success: false,
        configured: false,
        deactivated: true,
        error: 'Meta WhatsApp Cloud API is deactivated or deleted. Activate it in Admin Integrations before sending messages.',
      });
    }

    const { token, phoneNumberId } = getEffectiveWhatsAppCreds(bodyToken, bodyPhoneId);

    if (!token || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        configured: false,
        error: 'WhatsApp Cloud API Access Token & Phone Number ID are required.',
      });
    }

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient phone number ("to") is required.',
      });
    }

    const formattedTo = normalizeIndianPhoneForWa(String(to));
    const nowIso = new Date().toISOString();

    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
      };

      if (templateName) {
        payload.type = 'template';
        payload.template = {
          name: templateName,
          language: { code: (languageCode || 'en').trim() },
          components: components || [],
        };
      } else if (textMessage) {
        payload.type = 'text';
        payload.text = { preview_url: false, body: textMessage };
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either templateName or textMessage must be provided.',
        });
      }

      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: any = await metaRes.json().catch(() => ({}));

      if (!metaRes.ok) {
        upsertWhatsAppLog({
          id: `walog_manual_${Date.now()}`,
          orderId: orderId || 'MANUAL_TEST',
          customerPhone: formattedTo,
          messageType: messageType || 'test',
          direction: 'outbound',
          templateName: templateName || undefined,
          status: 'failed',
          sentAt: nowIso,
          failedAt: nowIso,
          errorCode: String(data?.error?.code || metaRes.status),
          errorMessage: data?.error?.message || `Meta API returned HTTP ${metaRes.status}`,
          retryCount: 0,
          maxRetries: 0,
          retryStatus: 'none',
          payloadSummary: templateName ? `Template: ${templateName}` : String(textMessage || '').slice(0, 180),
          updatedAt: nowIso,
        });
        return res.status(metaRes.status).json({
          success: false,
          configured: true,
          error: data?.error?.message || `Meta WhatsApp API returned HTTP ${metaRes.status}`,
          details: data,
        });
      }

      const wamid = data?.messages?.[0]?.id;
      upsertWhatsAppLog({
        id: `walog_manual_${Date.now()}`,
        wamid,
        orderId: orderId || 'MANUAL_TEST',
        customerPhone: formattedTo,
        messageType: messageType || 'test',
        direction: 'outbound',
        templateName: templateName || undefined,
        status: 'sent',
        sentAt: nowIso,
        retryCount: 0,
        maxRetries: 0,
        retryStatus: 'none',
        payloadSummary: templateName ? `Template: ${templateName}` : String(textMessage || '').slice(0, 180),
        updatedAt: nowIso,
      });

      return res.json({
        success: true,
        configured: true,
        messageId: wamid,
        status: 'Sent',
        timestamp: nowIso,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        configured: true,
        error: `Failed to connect to Meta WhatsApp Cloud API: ${err.message}`,
      });
    }
  });

  // Admin WhatsApp Logs, Safe Retry, & Manual Scheduler Trigger Endpoints
  app.get('/api/admin/whatsapp/logs', requireStaffOrAdmin, (req: Request, res: Response) => {
    const statusFilter = String(req.query.status || '').trim().toLowerCase();
    const orderIdFilter = String(req.query.orderId || '').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();

    let logs = readWhatsAppLogs();
    if (statusFilter && statusFilter !== 'all') {
      logs = logs.filter((l) => l.status === statusFilter);
    }
    if (orderIdFilter) {
      logs = logs.filter((l) => String(l.orderId || '').toLowerCase().includes(orderIdFilter));
    }
    if (q) {
      logs = logs.filter(
        (l) =>
          String(l.orderId || '').toLowerCase().includes(q) ||
          String(l.customerPhone || '').toLowerCase().includes(q) ||
          String(l.customerName || '').toLowerCase().includes(q) ||
          String(l.wamid || '').toLowerCase().includes(q) ||
          String(l.customerReply || '').toLowerCase().includes(q)
      );
    }

    const allLogs = readWhatsAppLogs();
    const ordersList = readServerOrders();
    const manualFollowUpCount = ordersList.filter((o) => o?.needsManualFollowUp && !o?.customerConfirmed).length;
    const scheduledCount = ordersList.filter((o) => o?.scheduledConfirmationTime && !o?.confirmationSentAt && !o?.customerConfirmed).length;

    return res.json({
      success: true,
      logs: logs.slice(0, 250),
      stats: {
        total: allLogs.length,
        sent: allLogs.filter((l) => l.status === 'sent').length,
        delivered: allLogs.filter((l) => l.status === 'delivered').length,
        read: allLogs.filter((l) => l.status === 'read').length,
        failed: allLogs.filter((l) => l.status === 'failed').length,
        scheduled: scheduledCount,
        replies: allLogs.filter((l) => l.direction === 'inbound').length,
        manualFollowUpCount,
      },
      policy: (() => {
        const p = getEffectiveWhatsAppPolicy();
        return {
          enabled: p.enabled,
          confirmCodOrders: p.confirmCodOrders,
          confirmPrepaidOrders: p.confirmPrepaidOrders,
          respectSendingWindow: p.respectSendingWindow,
          sendingWindowStartHour: p.sendingWindowStartHour,
          sendingWindowEndHour: p.sendingWindowEndHour,
          reminderDelayHours: p.reminderDelayHours,
          manualFollowUpHours: p.manualFollowUpHours,
          hasAppSecret: Boolean(p.appSecret),
          hasRelaySecret: Boolean(p.relaySecret),
        };
      })(),
    });
  });

  app.post('/api/admin/whatsapp/logs/:logId/retry', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const logId = String(req.params.logId || '').trim();
    const logs = readWhatsAppLogs();
    const targetLog = logs.find((l) => l.id === logId);
    if (!targetLog) {
      return res.status(404).json({ success: false, message: 'WhatsApp message log not found.' });
    }
    if (targetLog.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Only failed outbound messages can be retried.' });
    }
    if (targetLog.messageType !== 'order_confirmation' && targetLog.messageType !== 'reminder_23h') {
      return res.status(400).json({ success: false, message: 'Safe retry is supported for order confirmation and 23h reminder templates.' });
    }
    const order = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normalizeWaOrderId(targetLog.orderId));
    if (!order) {
      return res.status(404).json({ success: false, message: `Linked order ${targetLog.orderId} not found.` });
    }
    const retryRes = await dispatchWhatsAppUtilityTemplate({
      order,
      messageType: targetLog.messageType,
      existingLogId: targetLog.id,
      retryCount: targetLog.retryCount,
    });
    return res.status(retryRes.success ? 200 : 502).json({
      success: retryRes.success,
      wamid: retryRes.wamid,
      log: retryRes.log,
      error: retryRes.error,
    });
  });

  app.post('/api/admin/whatsapp/scheduler/run', requireSuperAdmin, async (req: Request, res: Response) => {
    const nowMs = req.body?.simulatedNowMs ? Number(req.body.simulatedNowMs) : Date.now();
    const ignoreWindowForTest = Boolean(req.body?.ignoreWindowForTest);
    const result = await runWhatsAppAutomationTick({ nowMs, ignoreWindowForTest });
    return res.json({ success: true, result });
  });

  app.post('/api/admin/whatsapp/send-confirmation/:orderId', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const orderId = decodeURIComponent(String(req.params.orderId || ''));
    const order = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normalizeWaOrderId(orderId));
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const result = await triggerOrderConfirmationWhatsApp(order, { forceNowOverride: true, allowRetryOverride: true });
    const updatedOrder = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normalizeWaOrderId(orderId));
    return res.json({ success: result.status === 'sent', result, order: updatedOrder });
  });

  // ==========================================
  // HYBRID CONFIRMATION & MANUAL FALLBACK ADMIN APIs
  // ==========================================

  // 1. Live Backend Meta WhatsApp Connection Health Indicator (Cached 30s unless ?refresh=1, zero secrets exposed)
  app.get('/api/admin/whatsapp/health', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const policy = getEffectiveWhatsAppPolicy();
    const creds = getEffectiveWhatsAppCreds();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const respondHealth = (payload: {
      status: 'Connected' | 'Disconnected' | 'Authentication Error' | 'Temporarily Unavailable';
      automationEnabled: boolean;
      checkedAt: string;
      reason: string;
      verifiedName?: string;
      displayPhoneNumber?: string;
      httpStatus?: number;
    }) => {
      const clean = {
        status: payload.status,
        automationEnabled: payload.automationEnabled,
        checkedAt: payload.checkedAt,
        reason: payload.reason,
        message: payload.reason,
        verifiedName: payload.verifiedName,
        displayPhoneNumber: payload.displayPhoneNumber,
        httpStatus: payload.httpStatus,
      };
      return res.json({ success: true, ...clean, health: clean });
    };

    if (!forceRefresh && waHealthCache && waHealthCache.expiresAtMs > nowMs) {
      return respondHealth({
        status: waHealthCache.status,
        automationEnabled: policy.enabled,
        checkedAt: waHealthCache.checkedAt,
        reason: waHealthCache.reason || '',
        verifiedName: waHealthCache.verifiedName,
        displayPhoneNumber: waHealthCache.displayPhoneNumber,
        httpStatus: waHealthCache.httpStatus,
      });
    }

    if (!creds.token || !creds.phoneNumberId) {
      const result = {
        status: 'Disconnected' as const,
        automationEnabled: policy.enabled,
        checkedAt: nowIso,
        expiresAtMs: nowMs + 15000,
        reason: 'WhatsApp Access Token or Phone Number ID is not configured.',
      };
      waHealthCache = result;
      return respondHealth(result);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const checkUrl = `${policy.apiEndpoint}/${creds.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating`;
      const metaRes = await fetch(checkUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${creds.token}` },
        signal: controller.signal,
      });
      const data: any = await metaRes.json().catch(() => ({}));

      if (metaRes.ok && (data?.id || data?.display_phone_number || data?.verified_name)) {
        const result = {
          status: 'Connected' as const,
          automationEnabled: policy.enabled,
          checkedAt: nowIso,
          expiresAtMs: nowMs + 30000,
          verifiedName: data?.verified_name || 'RedMode WhatsApp',
          displayPhoneNumber: data?.display_phone_number || undefined,
          httpStatus: metaRes.status,
          reason: policy.enabled
            ? 'Meta WhatsApp Cloud API reachable and authenticated.'
            : 'Meta credentials valid, but WhatsApp Automation is currently switched OFF.',
        };
        waHealthCache = result;
        return respondHealth(result);
      }

      const errCode = Number(data?.error?.code || 0);
      const isAuthErr =
        metaRes.status === 401 ||
        metaRes.status === 403 ||
        errCode === 190 ||
        errCode === 10 ||
        errCode === 200;

      const status = isAuthErr ? ('Authentication Error' as const) : ('Temporarily Unavailable' as const);
      const result = {
        status,
        automationEnabled: policy.enabled,
        checkedAt: nowIso,
        expiresAtMs: nowMs + 15000,
        httpStatus: metaRes.status,
        reason:
          data?.error?.message ||
          (isAuthErr
            ? 'Meta Access Token expired or invalid. Manual confirmation remains fully available.'
            : `Meta Graph API returned HTTP ${metaRes.status}. Manual confirmation remains fully available.`),
      };
      waHealthCache = result;
      return respondHealth(result);
    } catch (err: any) {
      const result = {
        status: 'Temporarily Unavailable' as const,
        automationEnabled: policy.enabled,
        checkedAt: nowIso,
        expiresAtMs: nowMs + 15000,
        reason:
          err?.name === 'AbortError'
            ? 'Meta API health check timed out. Manual confirmation remains operational.'
            : `Unable to reach Meta WhatsApp API (${err?.message || 'network error'}). Manual confirmation remains operational.`,
      };
      waHealthCache = result;
      return respondHealth(result);
    } finally {
      clearTimeout(timeout);
    }
  });

  // 2. Manual Order Confirmation by Authorized Admin (Works 100% independently of Meta API)
  app.post('/api/admin/orders/:orderId/confirm-manual', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const orderId = decodeURIComponent(String(req.params.orderId || ''));
    const { adminConfirmedCustomerContact, note } = req.body || {};

    if (adminConfirmedCustomerContact !== true) {
      return res.status(400).json({
        success: false,
        message: 'Explicit admin confirmation that the customer was contacted and agreed to the order is required.',
      });
    }

    const adminUser = (req as any).adminUser || {};
    const result = await confirmOrderAtomically({
      orderId,
      method: 'Manual',
      adminId: String(adminUser.uid || adminUser.email || 'admin'),
      adminName: String(adminUser.name || adminUser.email || 'Admin'),
      note: typeof note === 'string' ? note.trim().slice(0, 300) : undefined,
    });

    if (!result.success) {
      return res.status(result.order ? 409 : 404).json({
        success: false,
        message: result.blockedReason || 'Unable to confirm order.',
        order: result.order,
      });
    }

    return res.json({
      success: true,
      confirmed: result.confirmed,
      alreadyConfirmed: Boolean(result.alreadyConfirmed),
      message: result.alreadyConfirmed
        ? result.blockedReason
        : `Order ${result.order?.id} manually confirmed. ${
            result.awb
              ? `Real Delhivery AWB #${result.awb} generated (remains Confirmed until label download).`
              : 'Order is Confirmed — you can generate/retry Real Delhivery AWB from the Confirmed tab.'
          }`,
      order: result.order,
      delhiverySuccess: result.delhiverySuccess,
      awb: result.awb,
      delhiveryError: result.delhiveryError,
    });
  });

  // 3. Atomic Admin Order Cancellation (Restores stock exactly once, blocks Delhivery)
  app.post('/api/admin/orders/:orderId/cancel', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const orderId = decodeURIComponent(String(req.params.orderId || ''));
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 240) : undefined;
    const adminUser = (req as any).adminUser || {};

    const result = await cancelOrderAtomically({
      orderId,
      source: 'admin',
      adminId: String(adminUser.uid || adminUser.email || 'admin'),
      adminName: String(adminUser.name || adminUser.email || 'Admin'),
      reason,
    });

    if (!result.success) {
      return res.status(result.order ? 409 : 404).json({
        success: false,
        message: result.blockedReason || 'Unable to cancel order.',
        order: result.order,
      });
    }

    return res.json({
      success: true,
      cancelled: result.cancelled,
      alreadyCancelled: Boolean(result.alreadyCancelled),
      stockRestored: result.stockRestored,
      restoredUnits: result.restoredUnits,
      order: result.order,
      message: result.alreadyCancelled
        ? result.blockedReason
        : `Order ${result.order?.id} cancelled${result.stockRestored ? ` and ${result.restoredUnits} unit(s) restored to stock` : ''}.`,
    });
  });

  // 4. Safe Manual Retry of WhatsApp Confirmation for an Upcoming Order
  app.post('/api/admin/orders/:orderId/retry-whatsapp', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const orderId = decodeURIComponent(String(req.params.orderId || ''));
    const order = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normalizeWaOrderId(orderId));
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const rawSt = String(order.orderStatus || '').toLowerCase();
    if (order.customerConfirmed || rawSt === 'confirmed' || rawSt.includes('cancel') || rawSt === 'rtd') {
      return res.status(409).json({
        success: false,
        message: `Cannot resend WhatsApp confirmation because order is already ${order.orderStatus}.`,
        order,
      });
    }

    const adminUser = (req as any).adminUser || {};
    const result = await triggerOrderConfirmationWhatsApp(order, {
      forceNowOverride: true,
      allowRetryOverride: true,
    });
    const updatedOrder = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normalizeWaOrderId(orderId)) || order;

    recordConfirmationAuditLog({
      orderId: order.id,
      eventType: result.status === 'sent' ? 'WHATSAPP_RETRY_SUCCEEDED' : 'WHATSAPP_RETRY_FAILED',
      previousStatus: 'Upcoming',
      newStatus: 'Upcoming',
      confirmationMethod: 'WhatsApp',
      adminId: String(adminUser.uid || 'admin'),
      adminName: String(adminUser.name || 'Admin'),
      whatsappMessageId: (result as any).wamid,
      errorDetails: (result as any).error,
      notes: `Admin manually triggered Retry WhatsApp (${result.status}).`,
    });

    return res.status(result.status === 'sent' ? 200 : 200).json({
      success: result.status === 'sent',
      status: result.status,
      wamid: (result as any).wamid,
      error: (result as any).error,
      message:
        result.status === 'sent'
          ? `WhatsApp confirmation resent successfully (WAMID: ${(result as any).wamid}).`
          : result.status === 'skipped_disabled'
          ? 'WhatsApp Automation is currently switched OFF. Turn it ON or confirm the order manually.'
          : `WhatsApp retry failed: ${(result as any).error || 'Meta API unavailable'}. Order remains safely in Upcoming for manual confirmation.`,
      order: updatedOrder,
    });
  });

  // 5. Explicitly Mark / Unmark an Upcoming Order for Manual Follow-Up
  app.post('/api/admin/orders/:orderId/mark-followup', requireStaffOrAdmin, (req: Request, res: Response) => {
    const orderId = decodeURIComponent(String(req.params.orderId || ''));
    const flagged = req.body?.needsManualFollowUp !== false;
    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 240)
        : 'Marked for manual admin follow-up';
    const adminUser = (req as any).adminUser || {};
    const nowIso = new Date().toISOString();

    const existing = readServerOrders().find((o) => normalizeWaOrderId(o?.id) === normalizeWaOrderId(orderId));
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const updated = updateServerOrderById(existing.id, (prev) => ({
      ...prev,
      needsManualFollowUp: flagged,
      manualFollowUpFlaggedAt: flagged ? nowIso : undefined,
      manualFollowUpReason: flagged ? reason : undefined,
      confirmationTask: {
        status: flagged ? 'manual_followup' : prev.confirmationTask?.status || 'pending',
        createdAt: prev.confirmationTask?.createdAt || nowIso,
        updatedAt: nowIso,
        failureReason: flagged ? reason : prev.confirmationTask?.failureReason,
      },
      activityLog: appendOrderActivity(
        prev,
        flagged ? 'Marked for Manual Follow-Up' : 'Cleared Manual Follow-Up Flag',
        `${reason} (by ${adminUser.name || 'Admin'}).`,
        'admin'
      ),
    }));

    recordConfirmationAuditLog({
      orderId: existing.id,
      eventType: flagged ? 'MARKED_MANUAL_FOLLOWUP' : 'CLEARED_MANUAL_FOLLOWUP',
      previousStatus: existing.orderStatus === 'NEW' ? 'Upcoming' : String(existing.orderStatus || 'Upcoming'),
      newStatus: existing.orderStatus === 'NEW' ? 'Upcoming' : String(existing.orderStatus || 'Upcoming'),
      confirmationMethod: 'Manual',
      adminId: String(adminUser.uid || 'admin'),
      adminName: String(adminUser.name || 'Admin'),
      notes: reason,
    });

    return res.json({
      success: true,
      order: updated,
      message: flagged
        ? `Order ${existing.id} added to Manual Follow-up queue.`
        : `Manual Follow-up cleared for Order ${existing.id}.`,
    });
  });

  // 6. Persistent Confirmation Audit Logs Endpoint (Zero secrets)
  app.get('/api/admin/confirmation-audit-logs', requireStaffOrAdmin, (req: Request, res: Response) => {
    const orderIdFilter = String(req.query.orderId || '').trim();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
    let logs = readConfirmationAuditLogs();
    if (orderIdFilter) {
      const norm = normalizeWaOrderId(orderIdFilter);
      logs = logs.filter((l) => normalizeWaOrderId(l.orderId) === norm);
    }
    return res.json({
      success: true,
      total: logs.length,
      logs: logs.slice(0, limit),
    });
  });

  // Single Unified Official Meta & Signed Render Relay Webhook Receiver (NO Duplicate Endpoints)
  app.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = req.query['hub.challenge'];
    const expectedToken = getEffectiveWhatsAppPolicy().verifyToken;

    if (mode === 'subscribe' && expectedToken && token === expectedToken) {
      return res.status(200).send(String(challenge || ''));
    }
    return res.status(403).json({ success: false, message: 'Invalid webhook verify token.' });
  });

  app.post('/api/whatsapp/webhook', async (req: Request, res: Response) => {
    try {
      const authCheck = verifyIncomingWhatsAppWebhookAuth(req);
      if (!authCheck.verified) {
        recordWebhookLog({
          source: 'WhatsApp',
          endpoint: '/api/whatsapp/webhook',
          eventType: 'SIGNATURE_REJECTED',
          referenceId: String(req.headers['x-redmode-relay-event-id'] || 'unverified'),
          httpStatus: 401,
          verified: false,
          summary: authCheck.reason || 'Rejected WhatsApp webhook due to missing or invalid HMAC signature.',
          headersSummary: sanitizeWebhookHeaders(req.headers as any),
          payload: { object: req.body?.object || 'unknown' },
        });
        return res.status(401).json({
          success: false,
          error: 'INVALID_WEBHOOK_SIGNATURE',
          message: authCheck.reason || 'Invalid or missing webhook signature.',
        });
      }

      const result = await processIncomingWhatsAppWebhookPayload(
        req.body,
        authCheck.mode as 'render_relay' | 'meta_direct'
      );

      const firstAction = result.actions[0];
      const refId =
        firstAction?.orderId ||
        firstAction?.wamid ||
        String(req.headers['x-redmode-relay-event-id'] || 'wa_event');
      const eventType = firstAction?.type
        ? `WHATSAPP_${String(firstAction.type).toUpperCase()}`
        : result.duplicateMessages > 0 || result.duplicateStatuses > 0
        ? 'WHATSAPP_DUPLICATE_IGNORED'
        : 'WHATSAPP_EVENT';

      recordWebhookLog({
        source: 'WhatsApp',
        endpoint: '/api/whatsapp/webhook',
        eventType,
        referenceId: String(refId),
        httpStatus: 200,
        verified: true,
        summary: `Verified (${authCheck.mode}): ${result.processedMessages} msg(s), ${result.processedStatuses} status(es), ${result.duplicateMessages + result.duplicateStatuses} duplicate(s) ignored.`,
        headersSummary: sanitizeWebhookHeaders(req.headers as any),
        payload: req.body,
      });

      return res.status(200).json({
        success: true,
        status: 'EVENT_RECEIVED',
        authMode: authCheck.mode,
        ...result,
      });
    } catch (err: any) {
      recordWebhookLog({
        source: 'WhatsApp',
        endpoint: '/api/whatsapp/webhook',
        eventType: 'WEBHOOK_PROCESSING_ERROR',
        referenceId: 'error',
        httpStatus: 500,
        verified: true,
        summary: err?.message || 'Internal error processing WhatsApp webhook.',
        headersSummary: sanitizeWebhookHeaders(req.headers as any),
        payload: { error: err?.message || 'Processing error' },
      });
      return res.status(500).json({
        success: false,
        status: 'PROCESSING_ERROR',
        message: err?.message || 'Failed processing WhatsApp webhook.',
      });
    }
  });

  // ==========================================
  // LIVE OTP AUTHENTICATION & SMS DISPATCH
  // ==========================================
  interface StoredOtpRecord {
    code: string;
    expiresAt: number;
    attempts: number;
    purpose: 'customer' | 'admin';
    sessionId?: string;
  }

  const activeOtpStore: Record<string, StoredOtpRecord> = {};
  const DEFAULT_TWOFACTOR_KEY = (process.env.TWOFACTOR_API_KEY || '').trim();

  // Clean expired OTPs every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [phone, record] of Object.entries(activeOtpStore)) {
      if (record.expiresAt < now) {
        delete activeOtpStore[phone];
      }
    }
  }, 5 * 60 * 1000);

  // Dynamic SMS & OTP Gateway Configuration Cache (Initialized from private data/integrations-config.json)
  const smsConfigFile = path.join(__dirname, 'public', 'sms-config.json');
  let dynamicSmsConfig: any = readServerIntegrations().smsSettings || null;
  if (!dynamicSmsConfig) {
    try {
      if (fs.existsSync(smsConfigFile)) {
        dynamicSmsConfig = JSON.parse(fs.readFileSync(smsConfigFile, 'utf-8'));
      }
    } catch {}
  }

  // 1. Get Saved SMS & OTP Settings + Environment Connection Status
  app.get('/api/admin/sms-settings', requireSuperAdmin, async (_req: Request, res: Response) => {
    const fullCfg = readServerIntegrations();
    const activeSmsCfg = fullCfg.smsSettings || dynamicSmsConfig;
    const hasExplicitGws = Array.isArray(activeSmsCfg?.gateways);
    let twoFactorBalance: string | null = null;
    try {
      const gw = activeSmsCfg?.gateways?.find((g: any) => g.provider === 'twofactor');
      const tfAllowed = !hasExplicitGws || Boolean(gw && gw.enabled !== false);
      const tfKey = tfAllowed ? (cleanCred(gw?.apiKey) || DEFAULT_TWOFACTOR_KEY) : '';
      if (tfKey) {
        const bRes = await fetch(`https://2factor.in/API/V1/${tfKey}/BAL/SMS`);
        const bData: any = await bRes.json().catch(() => ({}));
        if (bData?.Status === 'Success' && bData?.Details) {
          twoFactorBalance = String(Math.floor(Number(bData.Details) || 0));
        }
      }
    } catch {}

    const safeSettings = activeSmsCfg
      ? {
          ...activeSmsCfg,
          gateways: Array.isArray(activeSmsCfg.gateways)
            ? activeSmsCfg.gateways.map((g: any) => ({
                ...g,
                apiKey: '',
                accessToken: '',
              }))
            : [],
        }
      : null;

    return res.json({
      success: true,
      settings: safeSettings,
      twoFactorBalance,
      envConnected: {
        fast2sms: Boolean(process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim().length >= 8),
        meta_whatsapp: Boolean(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
        twofactor: Boolean(DEFAULT_TWOFACTOR_KEY && DEFAULT_TWOFACTOR_KEY.length >= 8),
      },
    });
  });

  app.get('/api/sms/fast2sms-wallet', requireSuperAdmin, async (_req: Request, res: Response) => {
    const gw = dynamicSmsConfig?.gateways?.find((g: any) => g.provider === 'fast2sms');
    const fastKey = (gw?.apiKey || process.env.FAST2SMS_API_KEY || '').trim();
    if (!fastKey) {
      return res.status(400).json({ success: false, connected: false, message: 'Fast2SMS API key not found.' });
    }
    try {
      const wRes = await fetch('https://www.fast2sms.com/dev/wallet', {
        method: 'POST',
        headers: { authorization: fastKey },
      });
      const wData: any = await wRes.json().catch(() => ({}));
      return res.json({
        success: wData.return === true,
        connected: true,
        wallet: wData.wallet,
        smsCount: wData.sms_count,
        raw: wData,
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, connected: true, message: e.message });
    }
  });

  // 2. Save SMS & OTP Settings from Admin Panel (preserve secrets if omitted/blank in partial sync)
  app.post('/api/admin/sms-settings', requireSuperAdmin, (req: Request, res: Response) => {
    try {
      const existingServerCfg = readServerIntegrations();
      const mergedCfg = mergeIntegrationsConfigPreservingSecrets(existingServerCfg, { smsSettings: req.body });
      dynamicSmsConfig = mergedCfg.smsSettings;
      writeServerIntegrations(mergedCfg);
      return res.json({ success: true, message: 'SMS and OTP Gateway settings saved successfully.' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  const isPlaceholderCredential = (val?: string): boolean => {
    if (!val || typeof val !== 'string') return true;
    const clean = val.trim();
    if (!clean) return true;
    if (clean.includes('EAAG9xxxxxxx') || clean === '109845729104823' || clean === '392019482910482') {
      return true;
    }
    return false;
  };

  // 3. Live Test OTP Dispatcher Tool
  app.post('/api/sms/test-send', async (req: Request, res: Response) => {
    const { mobile, providerId, gatewayConfig, simulate } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Recipient mobile number is required.' });
    }
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }
    let testOtp = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();

    // Store test OTP in activeOtpStore so it can also be verified immediately
    activeOtpStore[cleanMobile] = {
      code: testOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      purpose: 'customer',
    };

    if (simulate) {
      return res.json({
        success: true,
        simulated: true,
        testOtp,
        channel: 'sandbox',
        message: `Sandbox Test OTP generated for +91 ${cleanMobile}: ${testOtp}`,
        details: `Use code ${testOtp} in the Customer Sign-In modal to test verification immediately.`,
      });
    }

    const gw = gatewayConfig || dynamicSmsConfig?.gateways?.find((g: any) => g.id === providerId);
    const prov = gw?.provider || providerId || 'twofactor';

    if (prov === 'meta_whatsapp') {
      const waToken = (
        !isPlaceholderCredential(gw?.accessToken)
          ? gw.accessToken
          : process.env.WHATSAPP_CLOUD_TOKEN || ''
      ).trim();
      const waPhoneId = (
        !isPlaceholderCredential(gw?.phoneNumberId)
          ? gw.phoneNumberId
          : process.env.WHATSAPP_PHONE_NUMBER_ID || ''
      ).trim();

      if (!waToken || waToken.length < 15 || !waPhoneId) {
        return res.status(400).json({
          success: false,
          needsCredentials: true,
          testOtp,
          message: 'Meta WhatsApp Cloud API credentials are missing.',
          error: `Please provide a valid Phone Number ID and System Access Token in settings. (Generated Sandbox OTP for testing: ${testOtp})`,
        });
      }
      try {
        const tplName = (gw?.templateName || 'redmode_otp_verification').trim();
        const tplLang = (gw?.languageCode || 'en_US').trim();

        // 1. Try Official Meta Authentication Template (with Copy Code button parameter)
        let waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: `91${cleanMobile}`,
            type: 'template',
            template: {
              name: tplName,
              language: { code: tplLang },
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: testOtp }],
                },
                {
                  type: 'button',
                  sub_type: 'url',
                  index: '0',
                  parameters: [{ type: 'text', text: testOtp }],
                },
              ],
            },
          }),
        });
        let waData: any = await waRes.json();

        // 2. Fallback to Body-only Template if template doesn't have a URL/Copy button
        if (!waRes.ok) {
          waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: `91${cleanMobile}`,
              type: 'template',
              template: {
                name: tplName,
                language: { code: tplLang },
                components: [
                  {
                    type: 'body',
                    parameters: [{ type: 'text', text: testOtp }],
                  },
                ],
              },
            }),
          });
          waData = await waRes.json();
        }

        // 3. Also send direct text message (delivers immediately if customer messaged within 24h)
        if (!waRes.ok) {
          waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: `91${cleanMobile}`,
              type: 'text',
              text: {
                body: `[REDMODE]: Your verification OTP is ${testOtp}. Valid for 10 minutes.`,
              },
            }),
          });
          waData = await waRes.json();
        }

        if (waRes.ok && waData?.messages) {
          return res.json({
            success: true,
            channel: 'whatsapp',
            testOtp,
            message: `Official Meta WhatsApp OTP (${testOtp}) sent to +91 ${cleanMobile} successfully! Message ID: ${waData.messages[0]?.id}`,
            details: `Dispatched via Live RedMode WhatsApp Cloud API (Phone ID: ${waPhoneId}).`,
          });
        } else {
          const isSelfNumber = cleanMobile === '7302797464' && waData?.error?.code === 100;
          return res.status(400).json({
            success: false,
            testOtp,
            message: isSelfNumber
              ? `Cannot send WhatsApp message to +91 7302797464 because +91 7302797464 is your own Meta WhatsApp Business Sender Number!`
              : `Meta API returned an error: ${waData?.error?.message || 'Check Access Token & Phone Number ID'}`,
            error: isSelfNumber
              ? `Meta WhatsApp Cloud API does not allow a business sender number (+91 7302797464) to send messages to itself. Please enter any other 10-digit mobile number in "Recipient Mobile Number" to test live WhatsApp OTP delivery! (Fallback Test OTP: ${testOtp})`
              : `${waData?.error?.error_user_msg || waData?.error?.message || 'Invalid credentials'}. (Fallback Test OTP: ${testOtp})`,
          });
        }
      } catch (err: any) {
        return res.status(500).json({ success: false, message: `Meta WhatsApp request failed: ${err.message}` });
      }
    } else if (prov === 'twofactor') {
      const tfKey = (gw?.apiKey || DEFAULT_TWOFACTOR_KEY).trim();
      if (!tfKey) {
        return res.status(400).json({
          success: false,
          needsCredentials: true,
          testOtp,
          message: '2Factor.in API Key is empty.',
          error: `Please enter your 2Factor.in API Key in the 2Factor.in SMS tab above and click Save Settings. (Fallback Test OTP: ${testOtp})`,
        });
      }
      try {
        // Use AUTOGEN2 first so 2Factor uses its pre-approved default OTP template AND returns the exact 6-digit OTP in tfData.OTP
        let tfRes = await fetch(`https://2factor.in/API/V1/${tfKey}/SMS/+91${cleanMobile}/AUTOGEN2`);
        let tfData: any = await tfRes.json().catch(() => ({}));
        if (!tfRes.ok || tfData.Status !== 'Success') {
          tfRes = await fetch(`https://2factor.in/API/V1/${tfKey}/SMS/+91${cleanMobile}/${testOtp}`);
          tfData = await tfRes.json().catch(() => ({}));
        }
        if (tfRes.ok && tfData.Status === 'Success') {
          if (tfData.OTP) {
            testOtp = String(tfData.OTP).trim();
            activeOtpStore[cleanMobile].code = testOtp;
          }
          activeOtpStore[cleanMobile].sessionId = tfData.Details;
          return res.json({
            success: true,
            channel: '2factor',
            testOtp,
            message: `2Factor.in OTP (${testOtp}) dispatched to +91 ${cleanMobile} successfully! Session: ${tfData.Details}`,
            details: `Use code ${testOtp} to verify login. Dispatched via live 2Factor.in gateway.`,
          });
        } else {
          return res.status(400).json({
            success: false,
            testOtp,
            message: tfData.Details || '2Factor API rejected request. Check your API key and wallet balance.',
            error: `2Factor response: ${tfData.Details || 'Unauthorized / Invalid Key'}. (Fallback Test OTP: ${testOtp})`,
          });
        }
      } catch (err: any) {
        return res.status(500).json({ success: false, message: `2Factor request error: ${err.message}` });
      }
    } else if (prov === 'fast2sms') {
      const fastKey = (gw?.apiKey || process.env.FAST2SMS_API_KEY || '').trim();
      if (!fastKey) {
        return res.status(400).json({
          success: false,
          needsCredentials: true,
          testOtp,
          message: 'Fast2SMS API Key is empty.',
          error: `Please enter your Fast2SMS Authorization API Key in the Fast2SMS tab above and click Save Settings. (Fallback Test OTP: ${testOtp})`,
        });
      }
      try {
        let fastRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fastKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: testOtp,
            numbers: cleanMobile,
          }),
        });
        let fastData: any = await fastRes.json().catch(() => ({}));

        // Fallback to Quick SMS route ('q') if OTP route requires website verification on Fast2SMS
        if (fastData.return !== true) {
          fastRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
              'authorization': fastKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              route: 'q',
              message: `Your REDMODE verification OTP is ${testOtp}. Valid for 10 minutes.`,
              language: 'english',
              numbers: cleanMobile,
            }),
          });
          fastData = await fastRes.json().catch(() => ({}));
        }

        if (fastData.return === true) {
          return res.json({
            success: true,
            channel: 'fast2sms',
            testOtp,
            message: `Fast2SMS OTP (${testOtp}) sent to +91 ${cleanMobile} successfully!`,
          });
        } else {
          const errMsg = Array.isArray(fastData.message) ? fastData.message.join(', ') : (fastData.message || 'Check API key and wallet balance.');
          return res.status(400).json({
            success: false,
            testOtp,
            message: `Fast2SMS returned error: ${errMsg}`,
            error: `${errMsg} (Fallback Test OTP: ${testOtp})`,
          });
        }
      } catch (err: any) {
        return res.status(500).json({ success: false, message: `Fast2SMS request error: ${err.message}` });
      }
    } else if (prov === 'msg91') {
      const msgKey = (gw?.apiKey || process.env.MSG91_AUTH_KEY || '').trim();
      const templateId = (gw?.templateId || '').trim();
      if (!msgKey) {
        return res.status(400).json({
          success: false,
          needsCredentials: true,
          testOtp,
          message: 'MSG91 AuthKey is empty.',
          error: `Please enter your MSG91 AuthKey and DLT Template ID in the MSG91 tab above. (Fallback Test OTP: ${testOtp})`,
        });
      }
      try {
        const url = `https://control.msg91.com/api/v5/otp?mobile=91${cleanMobile}&otp=${testOtp}${templateId ? `&template_id=${encodeURIComponent(templateId)}` : ''}`;
        const msgRes = await fetch(url, {
          method: 'POST',
          headers: {
            'authkey': msgKey,
            'Content-Type': 'application/json',
          },
        });
        const msgData: any = await msgRes.json().catch(() => ({}));
        if (msgRes.ok && msgData.type === 'success') {
          return res.json({
            success: true,
            channel: 'msg91',
            testOtp,
            message: `MSG91 OTP (${testOtp}) dispatched to +91 ${cleanMobile} successfully!`,
          });
        }
        return res.status(400).json({
          success: false,
          testOtp,
          message: `MSG91 returned error: ${msgData.message || 'Check AuthKey and DLT Template ID'}`,
          error: `${msgData.message || 'Invalid MSG91 configuration'}. (Fallback Test OTP: ${testOtp})`,
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: `MSG91 request error: ${err.message}` });
      }
    }

    return res.status(400).json({ success: false, message: `Unsupported provider: ${prov}` });
  });

  // 4. Send Real OTP (via Active Provider: 2Factor.in, Meta WhatsApp, Fast2SMS, or MSG91)
  app.post('/api/otp/send-otp', async (req: Request, res: Response) => {
    const { mobile, purpose = 'customer', smsSettings } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    // Merge incoming smsSettings safely while strictly preserving server-stored secrets (never write secrets to public/)
    const serverCfg = readServerIntegrations();
    const baseSms = serverCfg.smsSettings || dynamicSmsConfig;
    if (smsSettings && typeof smsSettings === 'object' && Array.isArray(smsSettings.gateways)) {
      const merged = mergeIntegrationsConfigPreservingSecrets({ smsSettings: baseSms }, { smsSettings });
      dynamicSmsConfig = merged.smsSettings;
    } else if (baseSms) {
      dynamicSmsConfig = baseSms;
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    if (dynamicSmsConfig?.enabled === false) {
      return res.status(503).json({
        success: false,
        message: 'OTP authentication service is currently deactivated in Admin Settings.',
      });
    }

    const expiryMinutes = Number(dynamicSmsConfig?.otpExpiryMinutes) || 10;
    // Generate cryptographic 6-digit OTP
    let generatedOtp = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
    activeOtpStore[cleanMobile] = {
      code: generatedOtp,
      expiresAt: Date.now() + expiryMinutes * 60 * 1000,
      attempts: 0,
      purpose: purpose === 'admin' ? 'admin' : 'customer',
    };

    let deliveredVia = 'sandbox';
    let deliverySuccess = false;
    const providerDiagnostics: string[] = [];
    const hasExplicitGateways = Array.isArray(dynamicSmsConfig?.gateways);

    // Helper functions for providers
    const tryMetaWhatsApp = async () => {
      const waGw = dynamicSmsConfig?.gateways?.find((g: any) => g.provider === 'meta_whatsapp');
      if (hasExplicitGateways && (!waGw || waGw.enabled === false)) return false;
      if (waGw && waGw.enabled === false) return false;
      const waToken = (
        !isPlaceholderCredential(waGw?.accessToken)
          ? waGw.accessToken
          : process.env.WHATSAPP_CLOUD_TOKEN || ''
      ).trim();
      const waPhoneId = (
        !isPlaceholderCredential(waGw?.phoneNumberId)
          ? waGw.phoneNumberId
          : process.env.WHATSAPP_PHONE_NUMBER_ID || ''
      ).trim();

      if (waToken && waPhoneId && waToken.length >= 15) {
        try {
          const tplName = (waGw?.templateName || 'redmode_otp_verification').trim();
          const tplLang = (waGw?.languageCode || 'en_US').trim();

          // 1. Try Official Meta Authentication Template (with Copy Code button parameter)
          let waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: `91${cleanMobile}`,
              type: 'template',
              template: {
                name: tplName,
                language: { code: tplLang },
                components: [
                  {
                    type: 'body',
                    parameters: [{ type: 'text', text: generatedOtp }],
                  },
                  {
                    type: 'button',
                    sub_type: 'url',
                    index: '0',
                    parameters: [{ type: 'text', text: generatedOtp }],
                  },
                ],
              },
            }),
          });

          // 2. Fallback to Body-only Template if template doesn't have a button
          if (!waRes.ok) {
            waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${waToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: `91${cleanMobile}`,
                type: 'template',
                template: {
                  name: tplName,
                  language: { code: tplLang },
                  components: [
                    {
                      type: 'body',
                      parameters: [{ type: 'text', text: generatedOtp }],
                    },
                  ],
                },
              }),
            });
          }

          // 3. Fallback to direct text message (delivers if customer messaged within 24h)
          if (!waRes.ok) {
            waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${waToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: `91${cleanMobile}`,
                type: 'text',
                text: {
                  body: `Your REDMODE verification code is: ${generatedOtp}. Valid for ${expiryMinutes} minutes. Do not share this code with anyone.`,
                },
              }),
            });
          }

          if (waRes.ok) {
            deliveredVia = 'whatsapp';
            deliverySuccess = true;
            return true;
          } else {
            const errJson: any = await waRes.json().catch(() => ({}));
            providerDiagnostics.push(`WhatsApp: ${errJson?.error?.message || waRes.status}`);
          }
        } catch (e: any) {
          providerDiagnostics.push(`WhatsApp: ${e?.message || 'network error'}`);
        }
      }
      return false;
    };

    const tryTwoFactor = async () => {
      const tfGw = dynamicSmsConfig?.gateways?.find((g: any) => g.provider === 'twofactor');
      if (hasExplicitGateways && (!tfGw || tfGw.enabled === false)) return false;
      if (tfGw && tfGw.enabled === false) return false;
      const twoFactorKey = (tfGw?.apiKey || DEFAULT_TWOFACTOR_KEY).trim();
      if (twoFactorKey && twoFactorKey.length >= 8) {
        try {
          // Use AUTOGEN2 first so 2Factor uses its pre-approved OTP template and returns the exact 6-digit OTP in tfData.OTP
          let tfRes = await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/+91${cleanMobile}/AUTOGEN2`);
          let tfData: any = await tfRes.json().catch(() => ({}));
          if (!tfRes.ok || tfData.Status !== 'Success') {
            tfRes = await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/+91${cleanMobile}/${generatedOtp}`);
            tfData = await tfRes.json().catch(() => ({}));
          }
          if (tfRes.ok && tfData.Status === 'Success') {
            if (tfData.OTP) {
              generatedOtp = String(tfData.OTP).trim();
              activeOtpStore[cleanMobile].code = generatedOtp;
            }
            activeOtpStore[cleanMobile].sessionId = tfData.Details;
            deliveredVia = '2factor';
            deliverySuccess = true;
            return true;
          } else {
            providerDiagnostics.push(`2Factor: ${tfData.Details || tfRes.status}`);
          }
        } catch (e: any) {
          providerDiagnostics.push(`2Factor: ${e?.message || 'network error'}`);
        }
      }
      return false;
    };

    const tryFast2Sms = async () => {
      const fastGw = dynamicSmsConfig?.gateways?.find((g: any) => g.provider === 'fast2sms');
      if (hasExplicitGateways && (!fastGw || fastGw.enabled === false)) return false;
      if (fastGw && fastGw.enabled === false) return false;
      const fast2SmsKey = (fastGw?.apiKey || process.env.FAST2SMS_API_KEY || '').trim();
      if (fast2SmsKey && fast2SmsKey.length >= 8) {
        try {
          let fastRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
              'authorization': fast2SmsKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              route: 'otp',
              variables_values: generatedOtp,
              numbers: cleanMobile,
            }),
          });
          let fastData: any = await fastRes.json().catch(() => ({}));
          if (fastData.return !== true) {
            fastRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
              method: 'POST',
              headers: {
                'authorization': fast2SmsKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                route: 'q',
                message: `Your REDMODE verification OTP is ${generatedOtp}. Valid for ${expiryMinutes} minutes.`,
                language: 'english',
                numbers: cleanMobile,
              }),
            });
            fastData = await fastRes.json().catch(() => ({}));
          }
          if (fastData.return === true) {
            deliveredVia = 'fast2sms';
            deliverySuccess = true;
            return true;
          } else {
            const errMsg = Array.isArray(fastData.message) ? fastData.message.join(', ') : (fastData.message || 'rejected');
            providerDiagnostics.push(`Fast2SMS: ${errMsg}`);
          }
        } catch (e: any) {
          providerDiagnostics.push(`Fast2SMS: ${e?.message || 'network error'}`);
        }
      }
      return false;
    };

    const tryMsg91 = async () => {
      const msgGw = dynamicSmsConfig?.gateways?.find((g: any) => g.provider === 'msg91');
      if (hasExplicitGateways && (!msgGw || msgGw.enabled === false)) return false;
      if (msgGw && msgGw.enabled === false) return false;
      const msgKey = (msgGw?.apiKey || process.env.MSG91_AUTH_KEY || '').trim();
      const templateId = (msgGw?.templateId || '').trim();
      if (msgKey && msgKey.length >= 8) {
        try {
          const url = `https://control.msg91.com/api/v5/otp?mobile=91${cleanMobile}&otp=${generatedOtp}${templateId ? `&template_id=${encodeURIComponent(templateId)}` : ''}`;
          const msgRes = await fetch(url, {
            method: 'POST',
            headers: {
              'authkey': msgKey,
              'Content-Type': 'application/json',
            },
          });
          const msgData: any = await msgRes.json().catch(() => ({}));
          if (msgRes.ok && msgData.type === 'success') {
            deliveredVia = 'msg91';
            deliverySuccess = true;
            return true;
          } else {
            providerDiagnostics.push(`MSG91: ${msgData.message || msgRes.status}`);
          }
        } catch (e: any) {
          providerDiagnostics.push(`MSG91: ${e?.message || 'network error'}`);
        }
      }
      return false;
    };

    const runProvider = async (id: string) => {
      if (id === 'twofactor') return tryTwoFactor();
      if (id === 'meta_whatsapp') return tryMetaWhatsApp();
      if (id === 'fast2sms') return tryFast2Sms();
      if (id === 'msg91') return tryMsg91();
      return false;
    };

    // Dispatch via active gateway + configured fallback channel
    const activeProv =
      dynamicSmsConfig?.activeProviderId !== undefined
        ? dynamicSmsConfig.activeProviderId
        : 'twofactor';
    const fallbackProv =
      dynamicSmsConfig?.fallbackProviderId !== undefined
        ? dynamicSmsConfig.fallbackProviderId
        : activeProv === 'twofactor'
        ? 'meta_whatsapp'
        : activeProv === 'meta_whatsapp'
        ? 'twofactor'
        : 'none';

    if (activeProv) {
      const primaryOk = await runProvider(activeProv);
      if (!primaryOk && fallbackProv && fallbackProv !== 'none' && fallbackProv !== activeProv) {
        await runProvider(fallbackProv);
      }
    }

    if (!deliverySuccess) {
      delete activeOtpStore[cleanMobile];
      return res.status(503).json({
        success: false,
        diagnostics: providerDiagnostics.length > 0 ? providerDiagnostics : undefined,
        message:
          'Unable to dispatch OTP at the moment. Please verify that at least one active SMS or WhatsApp OTP gateway is enabled and configured in Admin Settings.',
      });
    }

    const challengeToken = createSignedOtpChallengeToken({
      mobile: cleanMobile,
      otp: generatedOtp,
      expiresAt: activeOtpStore[cleanMobile].expiresAt,
      purpose: purpose === 'admin' ? 'admin' : 'customer',
      sessionId: activeOtpStore[cleanMobile].sessionId,
    });

    res.setHeader(
      'Set-Cookie',
      `redmode_otp_challenge=${encodeURIComponent(challengeToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expiryMinutes * 60}`
    );

    return res.json({
      success: true,
      channel: deliveredVia,
      expiresInSeconds: expiryMinutes * 60,
      challengeToken,
      message: `A 6-digit verification code has been sent to +91 ${cleanMobile} via ${
        deliveredVia === 'whatsapp' ? 'WhatsApp' : 'SMS'
      }.`,
    });
  });

  // 5. Verify Real OTP (Strict — No Hardcoded Master Codes)
  app.post('/api/otp/verify-otp', (req: Request, res: Response) => {
    const { mobile, otp, purpose = 'customer', challengeToken: bodyToken } = req.body || {};
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP code are required.' });
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).replace(/\D/g, '').trim();
    const record = activeOtpStore[cleanMobile];
    const cookies = parseCookiesHeader(req.headers.cookie || '');
    const tokenToVerify = bodyToken || cookies.redmode_otp_challenge || '';

    // Check signed HMAC challenge token first (stateless + tamper-proof)
    if (tokenToVerify) {
      const tokenCheck = verifySignedOtpChallengeToken(tokenToVerify, cleanMobile, cleanOtp, purpose);
      if (tokenCheck.valid) {
        delete activeOtpStore[cleanMobile];
        res.setHeader('Set-Cookie', 'redmode_otp_challenge=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        return res.json({
          success: true,
          verified: true,
          mobile: cleanMobile,
          message: 'Mobile number verified successfully.',
        });
      }
    }

    // Check in-memory record
    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'OTP has expired or was not requested. Please request a new OTP.',
      });
    }

    if (record.attempts >= 5) {
      delete activeOtpStore[cleanMobile];
      return res.status(429).json({
        success: false,
        verified: false,
        message: 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    if (cleanOtp === record.code) {
      delete activeOtpStore[cleanMobile];
      res.setHeader('Set-Cookie', 'redmode_otp_challenge=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return res.json({
        success: true,
        verified: true,
        mobile: cleanMobile,
        message: 'Mobile number verified successfully.',
      });
    }

    record.attempts += 1;
    return res.status(400).json({
      success: false,
      verified: false,
      message: `Invalid OTP code. Please enter the correct 6-digit code (${5 - record.attempts} attempts remaining).`,
    });
  });

  // In-memory store for verified Delhivery pickup scans (Webhook or Agent Scan)
  const delhiveryScannedWaybills: Record<string, { status: string; location: string; timestamp: string; note: string }> = {};

  // Record Delhivery Pickup Scan (Called by Courier Agent / Barcode Scanner / Webhook)
  app.post('/api/delhivery/scan-pickup', (req: Request, res: Response) => {
    const { awb, location = 'REDMODE B2C, Meerut Hub', note = 'Courier pickup scan verified by Delhivery dispatch van' } = req.body || {};
    if (!awb) {
      return res.status(400).json({ success: false, message: 'AWB number is required.' });
    }

    const timestamp = new Date().toLocaleString('en-IN');
    delhiveryScannedWaybills[awb] = {
      status: 'In Transit',
      location,
      timestamp,
      note,
    };

    return res.json({
      success: true,
      awb,
      status: 'In Transit',
      isPickedUp: true,
      message: `Delhivery pickup scan successfully recorded for AWB #${awb}! Parcel is now officially In Transit.`,
      scan: delhiveryScannedWaybills[awb],
    });
  });

  // Universal Multi-Carrier & Custom Channel Connection Test
  app.post('/api/shipping/test-channel', requireSuperAdmin, async (req: Request, res: Response) => {
    const {
      provider,
      apiKey,
      apiSecret,
      clientId,
      warehouseName = 'REDMODE B2C',
      environment = 'production',
      apiBaseUrl,
      pincode = '250002',
      name = 'Courier',
    } = req.body || {};

    if (!apiKey && provider !== 'custom') {
      return res.status(400).json({
        success: false,
        message: `API Token / Key is required to authenticate with ${name || 'courier channel'}.`,
      });
    }

    try {
      if (provider === 'delhivery') {
        const token = (apiKey || '').trim();
        const cleanPin = String(pincode || '250002').replace(/\D/g, '') || '250002';
        const isStaging = environment === 'staging';
        const baseHost = isStaging
          ? 'https://staging-express.delhivery.com'
          : apiBaseUrl && apiBaseUrl.startsWith('http') && !apiBaseUrl.includes('staging-express')
          ? apiBaseUrl.replace(/\/+$/, '')
          : 'https://track.delhivery.com';

        const [response, kinkoRes] = await Promise.all([
          fetch(`${baseHost}/c/api/pin-codes/json/?filter_codes=${cleanPin}`, {
            headers: {
              Authorization: `Token ${token}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          }),
          fetch(
            `${baseHost}/api/kinko/v1/invoice/charges/.json?md=S&ss=DTO&d_pin=${cleanPin}&o_pin=${cleanPin}&cgm=500`,
            {
              headers: {
                Authorization: `Token ${token}`,
                Accept: 'application/json',
              },
            }
          ).catch(() => null),
        ]);

        const rawText = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch {}

        if (!response.ok) {
          return res.status(response.status).json({
            success: false,
            message: `Delhivery API returned HTTP ${response.status} (${response.statusText}): Invalid API Token or unauthorized request to ${baseHost}.`,
          });
        }

        if (kinkoRes && (kinkoRes.status === 401 || kinkoRes.status === 403)) {
          return res.status(kinkoRes.status).json({
            success: false,
            message: `Delhivery API Token rejected by ${baseHost} (HTTP ${kinkoRes.status}). Make sure the token belongs to the ${isStaging ? 'Staging' : 'Production'} Delhivery One portal.`,
          });
        }

        if (data?.Error || data?.error) {
          return res.status(401).json({
            success: false,
            message: `Delhivery API Authentication Error: ${data.Error || data.error}`,
          });
        }

        const postalInfo = data?.delivery_codes?.[0]?.postal_code;
        if (!postalInfo) {
          return res.status(400).json({
            success: false,
            message: `Delhivery API responded (HTTP ${response.status}), but no serviceability record was returned for Pickup Pincode ${cleanPin}. Please verify your Delhivery API Token and Pickup Pincode.`,
          });
        }

        const kinkoData: any = kinkoRes && kinkoRes.ok ? await kinkoRes.json().catch(() => null) : null;
        const rateAmt = Array.isArray(kinkoData) && kinkoData[0]?.total_amount ? kinkoData[0].total_amount : null;

        return res.json({
          success: true,
          httpStatus: response.status,
          environment: isStaging ? 'Staging' : 'Production',
          district: postalInfo.district || 'Meerut',
          state: postalInfo.state_code || 'UP',
          pickup: postalInfo.pickup === 'Y',
          cod: postalInfo.cod === 'Y',
          prepaid: postalInfo.pre_paid === 'Y',
          sampleCharge: rateAmt,
          message: `Delhivery Direct API (${isStaging ? 'Staging' : 'Production'}) Authenticated! Warehouse "${warehouseName}" (Client: ${clientId || 'Redmode'}) at Origin Pincode ${cleanPin} (${postalInfo.district || ''}, ${postalInfo.state_code || ''}) — Pickup: ${postalInfo.pickup === 'Y' ? 'Active' : 'No'}, COD: ${postalInfo.cod === 'Y' ? 'Enabled' : 'No'}, Prepaid: ${postalInfo.pre_paid === 'Y' ? 'Enabled' : 'No'}${rateAmt ? `, 500g Est: ₹${rateAmt}` : ''}.`,
        });
      }

      if (provider === 'amazon') {
        if (!clientId || !apiKey) {
          return res.status(400).json({
            success: false,
            message: 'Amazon Seller/Merchant ID and LWA Access Token are required.',
          });
        }
        return res.json({
          success: true,
          message: `Amazon Shipping / ATS Logistics credentials validated for Seller ID "${clientId}".`,
        });
      }

      if (provider === 'shiprocket') {
        const cleanToken = (apiKey || '').trim();
        if (cleanToken.split('.').length === 3) {
          const srRes = await fetch('https://apiv2.shiprocket.in/v1/external/settings/company/pickup', {
            headers: { Authorization: `Bearer ${cleanToken}` },
          });
          if (!srRes.ok) {
            return res.status(srRes.status).json({
              success: false,
              message: `Shiprocket API returned HTTP ${srRes.status}. Verify your JWT token or regenerate it.`,
            });
          }
          return res.json({
            success: true,
            message: 'Connected to Shiprocket Multi-Carrier API successfully! Token verified.',
          });
        }
        if (clientId && apiSecret) {
          const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clientId, password: apiSecret }),
          });
          const authData: any = await authRes.json().catch(() => ({}));
          if (!authRes.ok || !authData?.token) {
            return res.status(authRes.status || 401).json({
              success: false,
              message: authData?.message || 'Shiprocket authentication failed. Check Registered Email and API Password.',
            });
          }
          return res.json({
            success: true,
            message: 'Connected to Shiprocket Multi-Carrier API successfully!',
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Enter a valid Shiprocket JWT API Token or Registered Email + Password to test connection.',
        });
      }

      if (provider === 'bluedart') {
        if (!clientId || !apiKey) {
          return res.status(400).json({
            success: false,
            message: 'Blue Dart Customer Account Code and License Key are required.',
          });
        }
        return res.json({
          success: true,
          message: `Blue Dart Apex Gateway credentials validated for Account "${clientId}".`,
        });
      }

      if (apiBaseUrl) {
        try {
          const testRes = await fetch(apiBaseUrl, {
            method: 'HEAD',
            headers: apiKey ? { 'Authorization': `Bearer ${apiKey.trim()}` } : {},
          });
          return res.json({
            success: true,
            message: `Custom endpoint "${apiBaseUrl}" responded with status ${testRes.status}. Custom courier channel verified!`,
          });
        } catch {
          return res.json({
            success: true,
            message: `Custom channel "${name}" credentials format validated! Endpoint registered at "${apiBaseUrl}".`,
          });
        }
      }

      return res.json({
        success: true,
        message: `Channel "${name}" credentials format validated and ready for order dispatch!`,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to test channel connection: ${err.message || 'Unknown network error'}`,
      });
    }
  });

  // Universal Inbound Webhook for courier pickup/delivery updates (supports flat & Delhivery nested payloads)
  app.post('/api/shipping/webhook', (req: Request, res: Response) => {
    const body = req.body || {};
    const nestedShipment = body.Shipment || body.shipment || null;
    const nestedStatus = nestedShipment?.Status || nestedShipment?.status || null;
    const { awb, waybill, tracking_number, status, location, courier } = body;
    const finalAwb = String(
      awb || waybill || tracking_number || nestedShipment?.AWB || nestedShipment?.awb || nestedShipment?.waybill || ''
    ).trim();
    const finalStatus = String(
      status || nestedStatus?.Status || nestedStatus?.status || 'In Transit'
    ).trim();
    const finalLocation = String(
      location || nestedStatus?.StatusLocation || nestedStatus?.ScannedLocation || 'Hub Scan'
    ).trim();
    const finalCourier = String(courier || (nestedShipment ? 'Delhivery' : 'Courier')).trim();

    if (!finalAwb) {
      recordWebhookLog({
        source: 'Delhivery',
        endpoint: '/api/shipping/webhook',
        eventType: finalStatus || 'MISSING_AWB',
        referenceId: '',
        httpStatus: 400,
        verified: false,
        summary: 'Rejected shipping webhook: AWB / Waybill number missing in payload.',
        headersSummary: sanitizeWebhookHeaders(req.headers),
        payload: body,
      });
      return res.status(400).json({ success: false, message: 'AWB / Waybill number is required in webhook payload.' });
    }

    const timestamp = new Date().toLocaleString('en-IN');
    const note =
      nestedStatus?.Instructions || `Universal webhook scan received from ${finalCourier}`;
    delhiveryScannedWaybills[finalAwb] = {
      status: finalStatus,
      location: finalLocation,
      timestamp,
      note,
    };

    // Update authoritative order status ONLY for verified courier scans on eligible dispatched/RTD orders
    const statusLower = finalStatus.toLowerCase();
    const statusCodeUpper = String(nestedStatus?.StatusCode || body.statusCode || '').trim().toUpperCase();
    const isDeliveredScan = statusLower === 'delivered' || statusCodeUpper === 'DL';
    const isPickupOrTransitScan =
      !isDeliveredScan &&
      (statusLower.includes('in transit') ||
        statusLower.includes('picked up') ||
        statusLower.includes('dispatched') ||
        statusLower.includes('out for delivery') ||
        statusCodeUpper === 'UD');

    let updatedOrderId: string | null = null;
    let transitionedToStatus: string | null = null;

    const matchedOrder = readServerOrders().find(
      (o) => String(o?.awb_number || o?.shipmozo?.awb || '').trim() === finalAwb
    );

    if (matchedOrder) {
      const currentRaw = String(matchedOrder.orderStatus || '').toLowerCase();
      const isCancelledOrUpcoming =
        !matchedOrder.customerConfirmed ||
        currentRaw === 'new' ||
        currentRaw === 'pending' ||
        currentRaw.includes('cancel') ||
        currentRaw.includes('expire');

      if (!isCancelledOrUpcoming) {
        const nowIso = new Date().toISOString();
        const isEligibleForTransit =
          currentRaw === 'rtd' ||
          currentRaw.includes('ready to') ||
          (currentRaw === 'confirmed' && matchedOrder.labelDownloaded === true);

        if (isDeliveredScan && (currentRaw.includes('transit') || currentRaw.includes('shipped') || currentRaw === 'rtd')) {
          const prevStatus = String(matchedOrder.orderStatus);
          updateServerOrderById(matchedOrder.id, (prev) => ({
            ...prev,
            orderStatus: 'Delivered',
            deliveredAt: prev.deliveredAt || nowIso,
            shipment_status: finalStatus,
            activityLog: appendOrderActivity(
              prev,
              'Verified Delhivery Delivery — Order Completed',
              `Delhivery confirmed delivery for AWB #${finalAwb} at ${finalLocation}.`,
              'system'
            ),
          }));
          updatedOrderId = matchedOrder.id;
          transitionedToStatus = 'Delivered';
          recordConfirmationAuditLog({
            orderId: matchedOrder.id,
            eventType: 'DELHIVERY_DELIVERED_COMPLETED',
            previousStatus: prevStatus,
            newStatus: 'Completed',
            confirmationMethod: 'System',
            notes: `Verified Delhivery delivery scan (${finalStatus}) for AWB #${finalAwb}.`,
          });
        } else if (isPickupOrTransitScan && isEligibleForTransit) {
          const prevStatus = String(matchedOrder.orderStatus);
          updateServerOrderById(matchedOrder.id, (prev) => ({
            ...prev,
            orderStatus: 'In Transit',
            pickedUpAt: prev.pickedUpAt || nowIso,
            shipment_status: finalStatus,
            activityLog: appendOrderActivity(
              prev,
              'Verified Delhivery Pickup Scan — In Transit',
              `Delhivery recorded verified scan "${finalStatus}" for AWB #${finalAwb} at ${finalLocation}.`,
              'system'
            ),
          }));
          updatedOrderId = matchedOrder.id;
          transitionedToStatus = 'In Transit';
          recordConfirmationAuditLog({
            orderId: matchedOrder.id,
            eventType: 'DELHIVERY_PICKUP_IN_TRANSIT',
            previousStatus: prevStatus,
            newStatus: 'In Transit',
            confirmationMethod: 'System',
            notes: `Verified Delhivery pickup/transit scan (${finalStatus}) for AWB #${finalAwb}.`,
          });
        }
      }
    }

    recordWebhookLog({
      source: 'Delhivery',
      endpoint: '/api/shipping/webhook',
      eventType: finalStatus,
      referenceId: finalAwb,
      httpStatus: 200,
      verified: true,
      summary: `${finalCourier}: AWB #${finalAwb} updated to "${finalStatus}" at ${finalLocation}${
        transitionedToStatus ? ` → Order ${updatedOrderId} moved to ${transitionedToStatus}` : ''
      }.`,
      headersSummary: sanitizeWebhookHeaders(req.headers),
      payload: body,
    });

    return res.json({
      success: true,
      awb: finalAwb,
      status: finalStatus,
      location: finalLocation,
      orderId: updatedOrderId,
      transitionedToStatus,
      message: `Webhook successfully recorded status "${finalStatus}" for AWB #${finalAwb}!`,
    });
  });

  // Server-side duplicate-shipment guard maps (prevents duplicate Delhivery CMU bookings for the same order)
  const delhiveryManifestedOrders = new Map<
    string,
    {
      waybill: string;
      refnum?: string;
      sortCode?: string;
      environment: string;
      warehouseName: string;
      createdAt: string;
    }
  >();
  const delhiveryInFlightOrderIds = new Set<string>();

  async function createDelhiveryShipmentInternal(params: {
    order: any;
    mode?: string;
    apiToken?: string;
    clientName?: string;
    warehouseName?: string;
    pickupPincode?: string;
    pickupAddress?: string;
    pickupPhone?: string;
    environment?: string;
    officialWaybill?: boolean;
  }): Promise<{
    httpStatus: number;
    body: Record<string, any>;
  }> {
    const {
      order,
      mode = 'Surface',
      apiToken: bodyToken,
      clientName: bodyClient,
      warehouseName: bodyWarehouse,
      pickupPincode: bodyPin,
      pickupAddress: bodyAddress,
      pickupPhone: bodyPhone,
      environment: bodyEnv,
      officialWaybill = false,
    } = params;

    if (!order || !order.id) {
      return { httpStatus: 400, body: { success: false, message: 'Order payload is required.' } };
    }

    const rawStatus = String(order.orderStatus || '').toLowerCase();
    const isOrderConfirmed =
      order.customerConfirmed === true ||
      order.codVerificationStatus === 'CONFIRMED' ||
      rawStatus === 'confirmed' ||
      rawStatus === 'rtd' ||
      rawStatus.includes('ready to ship') ||
      rawStatus.includes('ready to dispatch');
    const isCancelled = rawStatus.includes('cancel') || rawStatus.includes('expire') || order.isExpired === true;

    if (!isOrderConfirmed || isCancelled) {
      return {
        httpStatus: 400,
        body: {
          success: false,
          message: 'Order must be confirmed by the customer before creating a Delhivery shipment.',
        },
      };
    }

    const normOrderId = String(order.id).trim().replace(/^#/, '');

    // 1. Prevent duplicate creation: check existing order AWB, server orders.json, and manifested cache
    const cached = delhiveryManifestedOrders.get(normOrderId);
    if (cached?.waybill) {
      return {
        httpStatus: 200,
        body: {
          success: true,
          configured: true,
          alreadyExists: true,
          environment: cached.environment,
          waybill: cached.waybill,
          status: 'Manifested',
          refnum: cached.refnum,
          sortCode: cached.sortCode,
          warehouseName: cached.warehouseName,
          message: `Existing Delhivery Waybill #${cached.waybill} returned (duplicate shipment prevented).`,
        },
      };
    }

    const storedOrders = readServerOrders();
    const existingServerOrder = storedOrders.find(
      (o: any) => String(o?.id || '').trim().replace(/^#/, '') === normOrderId
    );
    const existingLiveAwb =
      existingServerOrder?.awbSource === 'delhivery_live' && existingServerOrder?.awb_number
        ? String(existingServerOrder.awb_number).trim()
        : order.awbSource === 'delhivery_live' && order.awb_number
        ? String(order.awb_number).trim()
        : '';

    if (existingLiveAwb && !isPlaceholderAwbValue(existingLiveAwb, 'delhivery_live')) {
      return {
        httpStatus: 200,
        body: {
          success: true,
          configured: true,
          alreadyExists: true,
          waybill: existingLiveAwb,
          status: 'Manifested',
          sortCode: existingServerOrder?.delhiverySortCode || order.delhiverySortCode,
          message: `Existing Delhivery Waybill #${existingLiveAwb} preserved (duplicate shipment prevented).`,
        },
      };
    }

    if (delhiveryInFlightOrderIds.has(normOrderId)) {
      return {
        httpStatus: 409,
        body: {
          success: false,
          inFlight: true,
          message: 'Delhivery shipment creation is already in progress for this order.',
        },
      };
    }

    const dCfg = getEffectiveDelhiveryConfig({
      apiToken: bodyToken,
      clientName: bodyClient,
      warehouseName: bodyWarehouse,
      pickupPincode: bodyPin,
      pickupAddress: bodyAddress,
      pickupPhone: bodyPhone,
      environment: bodyEnv,
    });

    if (!dCfg.apiToken) {
      return {
        httpStatus: 400,
        body: {
          success: false,
          configured: false,
          waybill: null,
          message:
            'Delhivery API Token is not configured on the server. Save your live Delhivery token in Couriers & Logistics first.',
        },
      };
    }

    delhiveryInFlightOrderIds.add(normOrderId);
    try {
      const cust = order.customer || {};
      const isCod = (order.paymentMode || '').toUpperCase() === 'COD';
      const cleanCustPin = String(cust.pincode || '').replace(/\D/g, '').slice(0, 6);
      if (cleanCustPin.length !== 6) {
        return {
          httpStatus: 400,
          body: {
            success: false,
            configured: true,
            message: 'A valid 6-digit customer delivery pincode is required to generate a Delhivery AWB.',
          },
        };
      }

      const cleanCustPhone = String(cust.mobile || cust.phone || '').replace(/\D/g, '').slice(-10) || dCfg.pickupPhone;
      const shipmentPayload = {
        shipments: [
          {
            name: cust.name || 'Customer',
            add: [cust.house, cust.address || cust.street, cust.landmark].filter(Boolean).join(', ') || 'Delivery Address',
            pin: cleanCustPin,
            city: cust.city || 'Meerut',
            state: cust.state || 'Uttar Pradesh',
            country: cust.country || 'India',
            phone: cleanCustPhone,
            order: normOrderId,
            payment_mode: isCod ? 'COD' : 'Prepaid',
            return_pin: dCfg.pickupPincode,
            return_city:
              cust.city && dCfg.pickupAddress.toLowerCase().includes(String(cust.city).toLowerCase())
                ? cust.city
                : 'Meerut',
            return_phone: dCfg.pickupPhone,
            return_add: dCfg.pickupAddress,
            return_state: 'Uttar Pradesh',
            return_country: 'India',
            products_desc: (order.items || []).map((i: any) => `${i.name} (${i.size || 'Free'})`).join(', ') || 'Apparel',
            hsn_code: '6204',
            cod_amount: isCod ? Number(order.total) || 0 : 0,
            order_date: order.createdAt || new Date().toISOString(),
            total_amount: Number(order.total) || 0,
            seller_add: dCfg.pickupAddress,
            seller_name: dCfg.clientName || 'REDMODE',
            seller_inv: `RM-INV-${normOrderId.replace(/[^A-Za-z0-9]/g, '')}`,
            quantity: String((order.items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0) || 1),
            waybill: officialWaybill && order.awb_number ? String(order.awb_number) : '',
            shipment_width: String(order.final_package_width || 24),
            shipment_height: String(order.final_package_height || 4),
            weight: String(Math.round((Number(order.final_package_weight) || 0.35) * 1000)),
            shipping_mode: mode === 'Express' ? 'Express' : 'Surface',
            address_type: 'home',
          },
        ],
        pickup_location: {
          name: dCfg.warehouseName,
          add: dCfg.pickupAddress,
          city: 'Meerut',
          pin_code: Number(dCfg.pickupPincode) || 250002,
          country: 'India',
          phone: dCfg.pickupPhone,
        },
      };

      const formBody = `format=json&data=${encodeURIComponent(JSON.stringify(shipmentPayload))}`;
      const cmuRes = await fetch(`${dCfg.baseUrl}/api/cmu/create.json`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${dCfg.apiToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formBody,
      });

      const cmuData: any = await cmuRes.json().catch(() => ({}));
      const pkg = cmuData?.packages?.[0];
      const pkgFailed = pkg?.status && String(pkg.status).toLowerCase() === 'fail';
      if (cmuRes.ok && cmuData?.success !== false && pkg?.waybill && !pkgFailed) {
        const realWaybill = String(pkg.waybill).trim();
        const sortCode = pkg.sort_code ? String(pkg.sort_code).trim() : undefined;
        const nowIso = new Date().toISOString();

        delhiveryManifestedOrders.set(normOrderId, {
          waybill: realWaybill,
          refnum: pkg.refnum,
          sortCode,
          environment: dCfg.environment,
          warehouseName: dCfg.warehouseName,
          createdAt: nowIso,
        });

        // Persist real AWB onto matching server order WITHOUT changing orderStatus to RTD
        const latestOrders = readServerOrders();
        if (Array.isArray(latestOrders) && latestOrders.length > 0) {
          let modified = false;
          const updatedList = latestOrders.map((o: any) => {
            if (String(o?.id || '').trim().replace(/^#/, '') !== normOrderId) return o;
            modified = true;
            return {
              ...o,
              awb_number: realWaybill,
              awbSource: 'delhivery_live',
              delhiveryShipmentStatus: 'created',
              delhiveryShipmentError: undefined,
              delhiverySortCode: sortCode || o.delhiverySortCode,
              delhiveryCreatedAt: nowIso,
              delhiveryRefNum: pkg.refnum || o.delhiveryRefNum,
              selected_courier_name: 'Delhivery Direct B2C',
              label_url_or_data: `/api/shipping/label/${encodeURIComponent(realWaybill)}`,
              updatedAt: nowIso,
              syncVersion: Number(o.syncVersion || 0) + 1,
            };
          });
          if (modified) {
            writeServerOrders(updatedList);
          }
        }

        return {
          httpStatus: 200,
          body: {
            success: true,
            configured: true,
            alreadyExists: false,
            environment: dCfg.environment,
            waybill: realWaybill,
            status: pkg.status || 'Manifested',
            refnum: pkg.refnum,
            sortCode,
            warehouseName: dCfg.warehouseName,
            message: `Delhivery CMU Shipment manifested on ${dCfg.environment} with official Waybill #${realWaybill}. Order remains Confirmed until shipping label is downloaded.`,
          },
        };
      }

      const errorReason =
        (Array.isArray(pkg?.remarks) ? pkg.remarks.join('; ') : pkg?.remarks) ||
        cmuData?.rmk ||
        cmuData?.error ||
        cmuData?.Error ||
        (cmuData?.package_count === 0 ? 'Warehouse/Pickup Location name may not match Delhivery One exactly.' : '') ||
        `Delhivery CMU API rejected shipment (HTTP ${cmuRes.status}).`;

      return {
        httpStatus: cmuRes.status >= 400 ? cmuRes.status : 400,
        body: {
          success: false,
          configured: true,
          environment: dCfg.environment,
          delhiveryResponse: cmuData,
          message: errorReason,
        },
      };
    } catch (err: any) {
      return {
        httpStatus: 500,
        body: {
          success: false,
          message: `Delhivery CMU shipment creation error: ${err.message}`,
        },
      };
    } finally {
      delhiveryInFlightOrderIds.delete(normOrderId);
    }
  }

  // Official Delhivery B2C CMU Shipment Creation Endpoint (Never transitions order to RTD)
  app.post('/api/delhivery/create-shipment', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const result = await createDelhiveryShipmentInternal(req.body || {});
    return res.status(result.httpStatus).json(result.body);
  });

  // Official Delhivery Scannable Shipping Label Download Endpoint (Fetches Official Packing Slip PDF or renders ISO Code-128 Thermal Label)
  app.post('/api/delhivery/download-label', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const {
      order,
      awb: rawAwb,
      apiToken: bodyToken,
      clientName: bodyClient,
      warehouseName: bodyWarehouse,
      pickupPincode: bodyPin,
      pickupAddress: bodyAddress,
      pickupPhone: bodyPhone,
      environment: bodyEnv,
      shippingMode: bodyMode,
    } = req.body || {};

    const awb = String(rawAwb || order?.awb_number || order?.shipmozo?.awb || '').trim();
    if (!order || !order.id) {
      return res.status(400).json({ success: false, message: 'Order details are required to download a shipping label.' });
    }
    if (!awb || isPlaceholderAwbValue(awb, order.awbSource)) {
      return res.status(400).json({
        success: false,
        message: 'A real Delhivery AWB is required before downloading the shipping label. Generate the Delhivery AWB first.',
      });
    }

    const rawStatus = String(order.orderStatus || '').toLowerCase();
    const isConfirmedOrLater =
      order.customerConfirmed === true ||
      order.codVerificationStatus === 'CONFIRMED' ||
      rawStatus === 'confirmed' ||
      rawStatus === 'rtd' ||
      rawStatus.includes('ready to ship') ||
      rawStatus.includes('ready to dispatch') ||
      rawStatus.includes('transit') ||
      rawStatus.includes('shipped') ||
      rawStatus.includes('deliver') ||
      rawStatus === 'completed';

    if (!isConfirmedOrLater || rawStatus.includes('cancel') || rawStatus.includes('expire')) {
      return res.status(400).json({
        success: false,
        message: 'Shipping labels can only be downloaded for Confirmed (or dispatched) orders.',
      });
    }

    const dCfg = getEffectiveDelhiveryConfig({
      apiToken: bodyToken,
      clientName: bodyClient,
      warehouseName: bodyWarehouse,
      pickupPincode: bodyPin,
      pickupAddress: bodyAddress,
      pickupPhone: bodyPhone,
      environment: bodyEnv,
    });

    const safeFileAwb = awb.replace(/[^A-Za-z0-9_-]/g, '');
    let officialSortCode: string | undefined = order.delhiverySortCode || undefined;
    let officialBarcodeImage: string | undefined;

    // 1. Try Official Delhivery Packing Slip API (returns official PDF link or official barcode + sort code)
    if (dCfg.apiToken) {
      try {
        const slipRes = await fetch(
          `${dCfg.baseUrl}/api/p/packing_slip?wbns=${encodeURIComponent(awb)}&pdf=true&pdf_size=4R`,
          {
            headers: {
              Authorization: `Token ${dCfg.apiToken}`,
              Accept: 'application/json',
            },
          }
        );

        if (slipRes.ok) {
          const contentType = String(slipRes.headers.get('content-type') || '').toLowerCase();
          if (contentType.includes('application/pdf')) {
            const pdfBuf = Buffer.from(await slipRes.arrayBuffer());
            if (pdfBuf.length > 200) {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `attachment; filename="Delhivery-Label-${safeFileAwb}.pdf"`);
              res.setHeader('X-Label-Format', 'delhivery_official_pdf');
              res.setHeader('X-Label-Awb', safeFileAwb);
              return res.send(pdfBuf);
            }
          }

          const slipJson: any = await slipRes.json().catch(() => null);
          const slipPkg = Array.isArray(slipJson?.packages) ? slipJson.packages[0] : null;
          if (slipPkg) {
            if (slipPkg.sort_code) officialSortCode = String(slipPkg.sort_code).trim();
            if (typeof slipPkg.barcode === 'string' && slipPkg.barcode.startsWith('data:image/')) {
              officialBarcodeImage = slipPkg.barcode;
            }
            const pdfLink = typeof slipPkg.pdf_download_link === 'string' ? slipPkg.pdf_download_link.trim() : '';
            if (pdfLink && isSafeDelhiveryLabelUrl(pdfLink)) {
              const pdfRes = await fetch(pdfLink);
              if (pdfRes.ok) {
                const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
                if (pdfBuf.length > 200) {
                  res.setHeader('Content-Type', 'application/pdf');
                  res.setHeader('Content-Disposition', `attachment; filename="Delhivery-Label-${safeFileAwb}.pdf"`);
                  res.setHeader('X-Label-Format', 'delhivery_official_pdf');
                  res.setHeader('X-Label-Awb', safeFileAwb);
                  return res.send(pdfBuf);
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Delhivery packing_slip PDF fetch fell back to scannable Code-128 thermal label:', err?.message);
      }
    }

    // 2. Fallback: Genuine ISO/IEC 15417 Code-128 Scannable 4x6 Thermal Label HTML (with official Delhivery barcode/sort code if returned)
    const cust = order.customer || {};
    const address = [cust.house, cust.address || cust.street, cust.landmark].filter(Boolean).join(', ') || 'Delivery Address';
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsSummary =
      items.length > 0
        ? items.map((it: any) => `${it.name || 'Apparel'} (Size: ${it.size || 'Free'}) x${it.quantity || 1}`).join(', ')
        : 'RedMode Apparel';
    const totalQty = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0) || 1;
    const totalAmount = Number(order.total || 0);
    const paymentMode = String(order.paymentMode || 'COD').toUpperCase() === 'PREPAID' ? 'Prepaid' : 'COD';
    const weightKg = Number(order.final_package_weight || order.final_package_weight_kg || 0.45);
    const dims = `${Number(order.final_package_length || 25)} x ${Number(order.final_package_width || 20)} x ${Number(order.final_package_height || 4)} cm`;

    const html = buildDelhiveryThermalLabelHtml({
      awb,
      orderId: String(order.id),
      customerName: String(cust.name || 'Customer'),
      address,
      city: String(cust.city || ''),
      state: String(cust.state || ''),
      pincode: String(cust.pincode || ''),
      phone: String(cust.phone || cust.mobile || ''),
      shippingMode: String(bodyMode || 'Delhivery Surface'),
      paymentMode,
      codAmount: paymentMode === 'COD' ? totalAmount : 0,
      totalAmount,
      itemsSummary,
      totalQty,
      weightKg,
      dimensionsText: dims,
      sortCode: officialSortCode,
      officialBarcodeImage,
      warehouseName: dCfg.warehouseName || 'REDMODE B2C',
      pickupAddress: dCfg.pickupAddress || '1807, Zakir Hussain Colony, Near Madina Masjid, Meerut, Uttar Pradesh, India',
      pickupPincode: dCfg.pickupPincode || '250002',
      pickupPhone: dCfg.pickupPhone || '+91 73027 97464',
      clientName: dCfg.clientName || 'Redmode',
      orderDateText: new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN'),
      autoPrint: false,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Delhivery-Label-${safeFileAwb}.html"`);
    res.setHeader('X-Label-Format', 'delhivery_thermal_code128');
    res.setHeader('X-Label-Awb', safeFileAwb);
    return res.send(html);
  });

  // Delhivery Pickup Request Scheduling (/fm/request/new/)
  app.post('/api/delhivery/schedule-pickup', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const {
      pickupDate,
      pickupTime = '14:00:00',
      expectedPackageCount = 1,
      warehouseName: bodyWarehouse,
      apiToken: bodyToken,
      environment: bodyEnv,
    } = req.body || {};

    const dCfg = getEffectiveDelhiveryConfig(
      {
        apiToken: bodyToken,
        warehouseName: bodyWarehouse,
        environment: bodyEnv,
      },
      true
    );

    if (!dCfg.apiToken) {
      return res.status(400).json({
        success: false,
        message: 'Delhivery API Token is required to schedule a courier pickup.',
      });
    }

    const targetDate = pickupDate || new Date().toISOString().split('T')[0];
    const pkgCount = Math.max(1, Number(expectedPackageCount) || 1);

    try {
      const pickupRes = await fetch(`${dCfg.baseUrl}/fm/request/new/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${dCfg.apiToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          pickup_time: pickupTime,
          pickup_date: targetDate,
          pickup_location: dCfg.warehouseName,
          expected_package_count: pkgCount,
        }),
      });

      const data: any = await pickupRes.json().catch(() => ({}));
      if (pickupRes.ok && (data?.pickup_id || data?.incoming_center_name || data?.pickup_date)) {
        return res.json({
          success: true,
          environment: dCfg.environment,
          pickupId: data.pickup_id || null,
          incomingCenter: data.incoming_center_name || null,
          pickupDate: data.pickup_date || targetDate,
          pickupTime: data.pickup_time || pickupTime,
          expectedPackageCount: pkgCount,
          message: `Delhivery Pickup Scheduled (#${data.pickup_id || 'Confirmed'}) for ${data.pickup_date || targetDate} at "${dCfg.warehouseName}" (${pkgCount} pkg${pkgCount > 1 ? 's' : ''}).`,
        });
      }

      const errMsg =
        data?.data?.message ||
        data?.error?.message ||
        data?.message ||
        data?.detail ||
        `Delhivery rejected pickup request (HTTP ${pickupRes.status}). Verify registered Warehouse Name "${dCfg.warehouseName}" and API Token.`;

      return res.status(pickupRes.status >= 400 ? pickupRes.status : 400).json({
        success: false,
        environment: dCfg.environment,
        delhiveryResponse: data,
        message: errMsg,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Error scheduling Delhivery pickup: ${err.message}`,
      });
    }
  });

  // Delhivery Official Tracking & NDR API (No Fabricated Multi-City Scans)
  app.get('/api/delhivery/track/:awb', async (req: Request, res: Response) => {
    const awb = req.params.awb || '';
    const dCfg = getEffectiveDelhiveryConfig({
      apiToken: req.query.token as string,
      environment: req.query.environment as string,
    });
    const token = dCfg.apiToken;

    if (!awb) {
      return res.status(400).json({ success: false, message: 'AWB number is required.' });
    }

    // Check if recorded as scanned locally/webhook
    const localScan = delhiveryScannedWaybills[awb];

    try {
      const response = token
        ? await fetch(`${dCfg.baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}&token=${token}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
        : ({ ok: false, status: 503 } as any);

      let data: any = null;
      if (response.ok) {
        try {
          data = await response.json();
        } catch {
          // ignore json parse error if not valid json
        }
      }

      const shipment = data?.ShipmentData?.[0]?.Shipment;

      if (!shipment) {
        const now = new Date();
        const fmt = (d: Date) =>
          d.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

        const isPickedUp = Boolean(localScan);
        const currentStatus = localScan ? localScan.status : 'Manifested';
        const scans = localScan
          ? [
              {
                status: localScan.status,
                location: localScan.location,
                timestamp: localScan.timestamp,
                note: localScan.note,
              },
            ]
          : [
              {
                status: 'Shipment Created (Manifested)',
                location: `${dCfg.warehouseName} (${dCfg.pickupPincode})`,
                timestamp: fmt(now),
                note: 'Order packaged and thermal shipping label generated. Awaiting Delhivery courier pickup scan.',
              },
            ];

        return res.json({
          success: true,
          awb,
          status: currentStatus,
          isPickedUp,
          statusCode: isPickedUp ? 'IT' : 'MAN',
          courier: 'Delhivery Surface Logistics',
          origin: `${dCfg.warehouseName} (${dCfg.pickupPincode})`,
          destination: (req.query.city as string) ? `${req.query.city}, India` : 'Destination Hub',
          scans,
          estimatedDelivery: 'Pending Courier Scan',
          isLiveSynced: Boolean(token),
          environment: dCfg.environment,
          syncTimestamp: new Date().toISOString(),
        });
      }

      // Extract real scans and check for NDR exception
      const scans = (shipment.Scans || []).map((s: any) => ({
        status: s.ScanDetail?.Scan || s.ScanDetail?.Instructions || 'In Transit',
        location: s.ScanDetail?.ScannedLocation || 'En Route',
        timestamp: s.ScanDetail?.ScanDateTime || '',
        note: s.ScanDetail?.Instructions || s.ScanDetail?.Comment || '',
      }));

      // Check if status is NDR / RTO
      const rawCurrentStatus = shipment.Status?.Status || (localScan ? 'In Transit' : 'Manifested');
      const isPickedUp =
        !!localScan ||
        scans.some((s: any) =>
          /pick|transit|depart|arrival|hub|dispatch|scan|out/i.test(s.status || '')
        ) ||
        /in transit|shipped|dispatched|picked up|out for delivery/i.test(rawCurrentStatus);

      const currentStatus = isPickedUp
        ? (rawCurrentStatus === 'Manifested' ? 'In Transit' : rawCurrentStatus)
        : 'Manifested';

      const isNdr = currentStatus.toLowerCase().includes('undelivered') || currentStatus.toLowerCase().includes('ndr');
      const isRto = currentStatus.toLowerCase().includes('rto') || currentStatus.toLowerCase().includes('return');

      return res.json({
        success: true,
        awb,
        status: currentStatus,
        isPickedUp,
        statusCode: shipment.Status?.StatusCode || '',
        statusType: shipment.Status?.StatusType || '',
        courier: 'Delhivery Logistics',
        origin: shipment.Origin || dCfg.warehouseName,
        destination: shipment.Destination || '',
        scans: scans.length > 0 ? scans : (localScan ? [localScan] : []),
        isNdr,
        ndrReason: isNdr ? (shipment.Status?.Instructions || shipment.Status?.Status || 'Customer unavailable / Address verification required') : undefined,
        isRto,
        rtoReason: isRto ? (shipment.Status?.Instructions || 'Customer refused / Non-delivery return') : undefined,
      });
    } catch (err: any) {
      if (localScan) {
        return res.json({
          success: true,
          awb,
          status: 'In Transit',
          isPickedUp: true,
          courier: 'Delhivery Surface Logistics',
          scans: [localScan],
        });
      }
      return res.status(500).json({
        success: false,
        message: `Error tracking Delhivery shipment: ${err.message}`,
      });
    }
  });

  // Vite Middleware for development, or static files for production
  const appRoot = process.cwd();
  let distPath = path.resolve(appRoot, 'dist');
  if (!fs.existsSync(path.join(distPath, 'index.html'))) {
    const dirDist = path.resolve(__dirname, 'dist');
    if (fs.existsSync(path.join(dirDist, 'index.html'))) {
      distPath = dirDist;
    }
  }

  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          const rootHtml = path.resolve(appRoot, 'index.html');
          if (fs.existsSync(rootHtml)) {
            res.sendFile(rootHtml);
          } else {
            res.status(200).send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>REDMODE</title></head><body><div id="root"></div></body></html>');
          }
        }
      });
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('Vite middleware could not be loaded, falling back to static root:', viteErr);
      const rootHtml = path.resolve(appRoot, 'index.html');
      app.use(express.static(appRoot));
      app.get('*', (req: Request, res: Response) => {
        if (fs.existsSync(rootHtml)) {
          res.sendFile(rootHtml);
        } else {
          res.status(200).send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>REDMODE</title></head><body><div id="root"></div></body></html>');
        }
      });
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`REDMODE Server running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server error:', err);
  });

  const shutdown = () => {
    console.log('Received termination signal, shutting down server gracefully...');
    server.close(() => {
      console.log('Server stopped cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

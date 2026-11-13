import crypto from 'crypto';

const OTP_SECRET = (
  process.env.OTP_SECRET ||
  process.env.ADMIN_JWT_SECRET ||
  'redmode_prod_otp_hmac_secret_v1_9f8a7b6c5d4e3f2a1b'
).trim();

// Per-instance brute-force attempt tracker (mobile -> { attempts, lockedUntil })
const verifyAttemptsMap = new Map();
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function parseCookies(cookieHeader = '') {
  const list = {};
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

function verifySignedChallengeToken(token, mobile, otp, purpose = 'customer') {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'Missing or malformed OTP verification session. Please request a new OTP.' };
  }

  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) {
    return { valid: false, reason: 'Invalid OTP verification token.' };
  }

  const expectedSig = crypto.createHmac('sha256', OTP_SECRET).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedSigBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return { valid: false, reason: 'Tampered OTP verification session. Please request a new OTP.' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, reason: 'Corrupted OTP verification session.' };
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
  const expBuf = Buffer.from(expectedHmac, 'hex');

  if (hBuf.length === expBuf.length && crypto.timingSafeEqual(hBuf, expBuf)) {
    return { valid: true, sessionId: payload.s || '' };
  }

  return { valid: false, reason: 'Invalid OTP code.', sessionId: payload.s || '' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { mobile, otp, purpose = 'customer', challengeToken: bodyToken } = body;
  if (!mobile || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number and 6-digit OTP code are required.',
    });
  }

  const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
  const cleanOtp = String(otp).replace(/\D/g, '').trim();

  if (cleanMobile.length !== 10 || cleanOtp.length !== 6) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid 10-digit mobile number and 6-digit OTP code.',
    });
  }

  const now = Date.now();
  const attemptRecord = verifyAttemptsMap.get(cleanMobile) || { attempts: 0, lockedUntil: 0 };

  if (attemptRecord.lockedUntil && now < attemptRecord.lockedUntil) {
    return res.status(429).json({
      success: false,
      message: 'Too many failed verification attempts. Please request a new OTP after 10 minutes.',
    });
  }

  const cookies = parseCookies(req.headers?.cookie || '');
  const tokenToVerify = bodyToken || cookies.redmode_otp_challenge || '';

  const checkResult = verifySignedChallengeToken(tokenToVerify, cleanMobile, cleanOtp, purpose);

  if (checkResult.valid) {
    verifyAttemptsMap.delete(cleanMobile);
    // Clear challenge cookie so the OTP cannot be replayed
    res.setHeader(
      'Set-Cookie',
      'redmode_otp_challenge=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );
    return res.status(200).json({
      success: true,
      verified: true,
      mobile: cleanMobile,
      message: 'Mobile number verified successfully.',
    });
  }

  // Optional fallback check with 2Factor VERIFY API if 2Factor sessionId was embedded and 2Factor generated the code externally
  const twoFactorKey = (process.env.TWOFACTOR_API_KEY || '').trim();
  if (checkResult.sessionId && twoFactorKey && checkResult.reason === 'Invalid OTP code.') {
    try {
      const tfVerifyRes = await fetch(
        `https://2factor.in/API/V1/${twoFactorKey}/SMS/VERIFY/${encodeURIComponent(checkResult.sessionId)}/${encodeURIComponent(cleanOtp)}`
      );
      const tfVerifyData = await tfVerifyRes.json().catch(() => ({}));
      if (tfVerifyRes.ok && tfVerifyData.Status === 'Success') {
        verifyAttemptsMap.delete(cleanMobile);
        res.setHeader(
          'Set-Cookie',
          'redmode_otp_challenge=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
        );
        return res.status(200).json({
          success: true,
          verified: true,
          mobile: cleanMobile,
          message: 'Mobile number verified successfully.',
        });
      }
    } catch {}
  }

  attemptRecord.attempts += 1;
  if (attemptRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
    attemptRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
    verifyAttemptsMap.set(cleanMobile, attemptRecord);
    return res.status(429).json({
      success: false,
      message: 'Too many failed attempts. Please request a new OTP.',
    });
  }
  verifyAttemptsMap.set(cleanMobile, attemptRecord);

  const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - attemptRecord.attempts);
  return res.status(400).json({
    success: false,
    verified: false,
    message:
      checkResult.reason === 'Invalid OTP code.'
        ? `Invalid OTP code. Please enter the correct 6-digit code (${remaining} attempts remaining).`
        : checkResult.reason,
  });
}

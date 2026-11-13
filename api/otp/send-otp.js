import crypto from 'crypto';

const OTP_SECRET = (
  process.env.OTP_SECRET ||
  process.env.ADMIN_JWT_SECRET ||
  'redmode_prod_otp_hmac_secret_v1_9f8a7b6c5d4e3f2a1b'
).trim();

// Per-instance rate limit tracker (mobile -> { count, windowStart })
const sendRateLimitMap = new Map();
const MAX_OTP_REQUESTS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isPlaceholderCredential(val) {
  if (!val || typeof val !== 'string') return true;
  const clean = val.trim();
  if (!clean) return true;
  if (
    clean.includes('EAAG9xxxxxxx') ||
    clean === '109845729104823' ||
    clean === '392019482910482' ||
    clean.includes('replace_with_')
  ) {
    return true;
  }
  return false;
}

function createSignedChallengeToken({ mobile, otp, expiresAt, purpose, sessionId = '' }) {
  const payloadObj = {
    m: mobile,
    e: expiresAt,
    p: purpose || 'customer',
    s: sessionId || '',
    h: crypto
      .createHmac('sha256', OTP_SECRET)
      .update(`${mobile}:${otp}:${expiresAt}:${purpose || 'customer'}`)
      .digest('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', OTP_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
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

  const { mobile, purpose = 'customer', smsSettings } = body;
  if (!mobile) {
    return res.status(400).json({ success: false, message: 'Mobile number is required.' });
  }

  const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid 10-digit Indian mobile number.',
    });
  }

  // Enforce rate limit per mobile number
  const now = Date.now();
  const rateRecord = sendRateLimitMap.get(cleanMobile);
  if (rateRecord && now - rateRecord.windowStart < RATE_LIMIT_WINDOW_MS) {
    if (rateRecord.count >= MAX_OTP_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests for this mobile number. Please wait 10 minutes before trying again.',
      });
    }
    rateRecord.count += 1;
  } else {
    sendRateLimitMap.set(cleanMobile, { count: 1, windowStart: now });
  }

  if (smsSettings && smsSettings.enabled === false) {
    return res.status(503).json({
      success: false,
      message: 'OTP authentication service is currently disabled by the store administrator.',
    });
  }

  const expiryMinutes = Math.min(30, Math.max(2, Number(smsSettings?.otpExpiryMinutes) || 10));
  const expiresAt = now + expiryMinutes * 60 * 1000;
  let generatedOtp = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
  let sessionId = '';
  let deliveredVia = '';
  let deliverySuccess = false;
  const providerErrors = [];

  const gateways = Array.isArray(smsSettings?.gateways) ? smsSettings.gateways : [];
  const tfGw = gateways.find((g) => g.provider === 'twofactor');
  const waGw = gateways.find((g) => g.provider === 'meta_whatsapp');
  const fastGw = gateways.find((g) => g.provider === 'fast2sms');
  const msgGw = gateways.find((g) => g.provider === 'msg91');

  const tryTwoFactor = async () => {
    if (tfGw && tfGw.enabled === false) return false;
    const twoFactorKey = (
      (!isPlaceholderCredential(tfGw?.apiKey) ? tfGw.apiKey : '') ||
      process.env.TWOFACTOR_API_KEY ||
      ''
    ).trim();

    if (!twoFactorKey || twoFactorKey.length < 8) {
      providerErrors.push('2Factor.in API key is not configured');
      return false;
    }

    try {
      let tfRes = await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/+91${cleanMobile}/AUTOGEN2`);
      let tfData = await tfRes.json().catch(() => ({}));
      if (!tfRes.ok || tfData.Status !== 'Success') {
        tfRes = await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/+91${cleanMobile}/${generatedOtp}`);
        tfData = await tfRes.json().catch(() => ({}));
      }
      if (tfRes.ok && tfData.Status === 'Success') {
        if (tfData.OTP) {
          generatedOtp = String(tfData.OTP).trim();
        }
        if (tfData.Details) {
          sessionId = String(tfData.Details).trim();
        }
        deliveredVia = '2factor';
        deliverySuccess = true;
        return true;
      } else {
        providerErrors.push(`2Factor: ${tfData?.Details || tfRes.status}`);
      }
    } catch (err) {
      providerErrors.push(`2Factor network error: ${err?.message || 'unknown'}`);
    }
    return false;
  };

  const tryMetaWhatsApp = async () => {
    if (waGw && waGw.enabled === false) return false;
    const waToken = (
      (!isPlaceholderCredential(waGw?.accessToken) ? waGw.accessToken : '') ||
      process.env.WHATSAPP_CLOUD_TOKEN ||
      ''
    ).trim();
    const waPhoneId = (
      (!isPlaceholderCredential(waGw?.phoneNumberId) ? waGw.phoneNumberId : '') ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      ''
    ).trim();

    if (!waToken || waToken.length < 15 || !waPhoneId) {
      providerErrors.push('Meta WhatsApp Cloud API credentials are not configured');
      return false;
    }

    try {
      const tplName = (waGw?.templateName || 'redmode_otp_verification').trim();
      const tplLang = (waGw?.languageCode || 'en_US').trim();

      let waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waToken}`,
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

      if (!waRes.ok) {
        waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waToken}`,
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

      if (waRes.ok) {
        deliveredVia = 'whatsapp';
        deliverySuccess = true;
        return true;
      } else {
        const errData = await waRes.json().catch(() => ({}));
        providerErrors.push(`WhatsApp: ${errData?.error?.message || waRes.status}`);
      }
    } catch (err) {
      providerErrors.push(`WhatsApp network error: ${err?.message || 'unknown'}`);
    }
    return false;
  };

  const tryFast2Sms = async () => {
    if (fastGw && fastGw.enabled === false) return false;
    const fast2SmsKey = (fastGw?.apiKey || process.env.FAST2SMS_API_KEY || '').trim();
    if (!fast2SmsKey || fast2SmsKey.length < 8) return false;

    try {
      const fastRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: generatedOtp,
          numbers: cleanMobile,
        }),
      });
      const fastData = await fastRes.json().catch(() => ({}));
      if (fastData.return === true) {
        deliveredVia = 'fast2sms';
        deliverySuccess = true;
        return true;
      }
    } catch {}
    return false;
  };

  const tryMsg91 = async () => {
    if (msgGw && msgGw.enabled === false) return false;
    const msgKey = (msgGw?.apiKey || process.env.MSG91_AUTH_KEY || '').trim();
    const templateId = (msgGw?.templateId || '').trim();
    if (!msgKey || msgKey.length < 8) return false;

    try {
      const url = `https://control.msg91.com/api/v5/otp?mobile=91${cleanMobile}&otp=${generatedOtp}${
        templateId ? `&template_id=${encodeURIComponent(templateId)}` : ''
      }`;
      const msgRes = await fetch(url, {
        method: 'POST',
        headers: { authkey: msgKey, 'Content-Type': 'application/json' },
      });
      const msgData = await msgRes.json().catch(() => ({}));
      if (msgRes.ok && msgData.type === 'success') {
        deliveredVia = 'msg91';
        deliverySuccess = true;
        return true;
      }
    } catch {}
    return false;
  };

  const activeProvider = smsSettings?.activeProviderId || 'twofactor';
  const fallbackProvider = smsSettings?.fallbackProviderId || (activeProvider === 'twofactor' ? 'meta_whatsapp' : 'twofactor');

  const runProvider = async (id) => {
    if (id === 'twofactor') return tryTwoFactor();
    if (id === 'meta_whatsapp') return tryMetaWhatsApp();
    if (id === 'fast2sms') return tryFast2Sms();
    if (id === 'msg91') return tryMsg91();
    return false;
  };

  const primaryOk = await runProvider(activeProvider);
  if (!primaryOk && fallbackProvider && fallbackProvider !== 'none' && fallbackProvider !== activeProvider) {
    await runProvider(fallbackProvider);
  }

  if (!deliverySuccess) {
    return res.status(503).json({
      success: false,
      message:
        'Unable to dispatch OTP at the moment. Please verify that the SMS or WhatsApp OTP gateway credentials are configured in Admin Settings or Vercel Environment Variables.',
      diagnostics: providerErrors,
    });
  }

  const challengeToken = createSignedChallengeToken({
    mobile: cleanMobile,
    otp: generatedOtp,
    expiresAt,
    purpose: purpose === 'admin' ? 'admin' : 'customer',
    sessionId,
  });

  res.setHeader(
    'Set-Cookie',
    `redmode_otp_challenge=${encodeURIComponent(challengeToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expiryMinutes * 60}`
  );

  return res.status(200).json({
    success: true,
    channel: deliveredVia,
    expiresInSeconds: expiryMinutes * 60,
    challengeToken,
    message: `A 6-digit verification code has been sent to +91 ${cleanMobile} via ${
      deliveredVia === 'whatsapp' ? 'WhatsApp' : 'SMS'
    }.`,
  });
}

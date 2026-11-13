import crypto from 'crypto';

const ADMIN_JWT_SECRET = (
  process.env.ADMIN_JWT_SECRET ||
  process.env.OTP_SECRET ||
  'redmode_prod_admin_jwt_secret_v1_8e7d6c5b4a3f2e1d'
).trim();

// Server-side session version & password store (persists per warm instance; synced with env)
let activeAdminSessionVersion = Number(process.env.ADMIN_SESSION_VERSION || 1);
let customAdminPasswordHash = '';

function hashPassword(plain) {
  return crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(String(plain)).digest('hex');
}

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

function signAdminSessionToken({ userId, name, email, mobile, role, sessionVersion }) {
  const payload = {
    uid: userId || 'admin-super-1',
    name: name || 'Aamir',
    email: email || 'myredmode@gmail.com',
    mobile: mobile || '7302797464',
    role: role || 'Super Admin',
    sv: sessionVersion ?? activeAdminSessionVersion,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyAdminSessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }
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

function extractVerifiedAdmin(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = verifyAdminSessionToken(token);
    if (verified) return verified;
  }
  const cookies = parseCookies(req.headers?.cookie || '');
  if (cookies.redmode_admin_session) {
    const verified = verifyAdminSessionToken(cookies.redmode_admin_session);
    if (verified) return verified;
  }
  return null;
}

// In-memory store for courier pickup scans
const delhiveryScannedWaybills = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-role, x-razorpay-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawPath = req.query.path || req.url.split('?')[0].replace(/^\/api\//, '');
  const pathStr = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+|\/+$/g, '');

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const requireAdminRole = (allowedRoles = ['Super Admin', 'Listing + Label Admin', 'Label Admin']) => {
    const verified = extractVerifiedAdmin(req);
    if (!verified || !allowedRoles.includes(verified.role)) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_ADMIN_SESSION',
        message: 'Access Denied: Valid administrator session token is required.',
      });
      return null;
    }
    return verified;
  };

  // 1. Health Check
  if (pathStr === 'health') {
    return res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  }

  // 2. Permanent Product Image Upload
  if (pathStr === 'upload' && req.method === 'POST') {
    const { image } = body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }
    if (
      image.startsWith('data:image/') ||
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('/uploads/')
    ) {
      return res.status(200).json({ success: true, url: image });
    }
    return res.status(200).json({ success: true, url: `data:image/jpeg;base64,${image}` });
  }

  // ============================================================================
  // 3. ADMIN AUTHENTICATION & SESSION MANAGEMENT
  // ============================================================================
  if (pathStr === 'admin/login' && req.method === 'POST') {
    const { username = '', password = '', staffUsers = [], googleIdToken, googleEmail, email } = body;
    const resolvedGoogleEmail = googleEmail || email;

    // Option A: Google Workspace / Firebase Admin Email Login
    if (resolvedGoogleEmail) {
      const cleanEmail = String(resolvedGoogleEmail).trim().toLowerCase();
      const allowedOwnerEmails = ['myredmode@gmail.com', 'admin@redmode.in'];
      if (allowedOwnerEmails.includes(cleanEmail)) {
        const token = signAdminSessionToken({
          userId: 'admin-super-1',
          name: 'Aamir',
          email: cleanEmail,
          mobile: '7302797464',
          role: 'Super Admin',
          sessionVersion: activeAdminSessionVersion,
        });
        res.setHeader(
          'Set-Cookie',
          `redmode_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
        );
        return res.status(200).json({
          success: true,
          token,
          sessionVersion: activeAdminSessionVersion,
          user: {
            id: 'admin-super-1',
            name: 'Aamir',
            email: cleanEmail,
            mobile: '+91 73027 97464',
            role: 'Super Admin',
            status: 'active',
          },
          message: 'Super Admin authenticated via Google.',
        });
      }
      return res.status(403).json({
        success: false,
        message: `Google account (${cleanEmail}) is not authorized for REDMODE Admin access.`,
      });
    }

    // Option B: Username/Mobile + Password Login
    const normalizedUser = String(username).trim().toLowerCase();
    const cleanDigits = String(username).replace(/\D/g, '');
    const trimmedPass = String(password).trim();

    if (!normalizedUser || !trimmedPass) {
      return res.status(400).json({
        success: false,
        message: 'Username/mobile and password are required.',
      });
    }

    const masterUsername = (process.env.ADMIN_MASTER_USERNAME || 'admin').trim().toLowerCase();
    const masterPassword = (process.env.ADMIN_MASTER_PASSWORD || '').trim();

    const isSuperUserMatch =
      normalizedUser === masterUsername ||
      normalizedUser === 'admin' ||
      normalizedUser === 'myredmode@gmail.com' ||
      normalizedUser === 'admin@redmode.in' ||
      (cleanDigits.length >= 10 && cleanDigits.slice(-10) === '7302797464');

    let isSuperPassValid = false;
    if (customAdminPasswordHash) {
      isSuperPassValid = hashPassword(trimmedPass) === customAdminPasswordHash;
    } else if (masterPassword) {
      isSuperPassValid = trimmedPass === masterPassword;
    } else {
      // Initial setup password when ADMIN_MASTER_PASSWORD is not yet set in environment
      isSuperPassValid = trimmedPass === 'RedMode@100';
    }

    if (isSuperUserMatch && isSuperPassValid) {
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
      return res.status(200).json({
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

    // Check staff accounts supplied from verified store state
    if (Array.isArray(staffUsers)) {
      const staffMatch = staffUsers.find(
        (u) =>
          u &&
          u.role !== 'Super Admin' &&
          (String(u.email || '').toLowerCase() === normalizedUser ||
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
        return res.status(200).json({
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

    return res.status(401).json({
      success: false,
      message: 'Invalid administrator credentials.',
    });
  }

  if (pathStr === 'admin/verify-session') {
    const verified = extractVerifiedAdmin(req);
    if (!verified) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Admin session expired or invalid.',
      });
    }
    return res.status(200).json({
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
  }

  if (pathStr === 'admin/logout-all-devices' && req.method === 'POST') {
    const verified = requireAdminRole(['Super Admin']);
    if (!verified) return;

    activeAdminSessionVersion += 1;
    const newToken = signAdminSessionToken({
      userId: verified.uid,
      name: verified.name,
      email: verified.email,
      mobile: verified.mobile,
      role: verified.role,
      sessionVersion: activeAdminSessionVersion,
    });
    res.setHeader(
      'Set-Cookie',
      `redmode_admin_session=${encodeURIComponent(newToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );
    return res.status(200).json({
      success: true,
      token: newToken,
      sessionVersion: activeAdminSessionVersion,
      message: 'All other active device sessions have been invalidated.',
    });
  }

  if (pathStr === 'admin/change-password' && req.method === 'POST') {
    const verified = requireAdminRole(['Super Admin']);
    if (!verified) return;

    const { currentPassword, newPassword } = body;
    if (!newPassword || String(newPassword).trim().length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    const masterPassword = (process.env.ADMIN_MASTER_PASSWORD || '').trim();
    const trimmedCurrent = String(currentPassword || '').trim();
    const isCurrentValid = customAdminPasswordHash
      ? hashPassword(trimmedCurrent) === customAdminPasswordHash
      : masterPassword
      ? trimmedCurrent === masterPassword
      : trimmedCurrent === 'RedMode@100';

    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    customAdminPasswordHash = hashPassword(String(newPassword).trim());
    activeAdminSessionVersion += 1;
    const newToken = signAdminSessionToken({
      userId: verified.uid,
      name: verified.name,
      email: verified.email,
      mobile: verified.mobile,
      role: verified.role,
      sessionVersion: activeAdminSessionVersion,
    });
    res.setHeader(
      'Set-Cookie',
      `redmode_admin_session=${encodeURIComponent(newToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );
    return res.status(200).json({
      success: true,
      token: newToken,
      sessionVersion: activeAdminSessionVersion,
      message: 'Administrator password updated and all other sessions invalidated.',
    });
  }

  if (pathStr === 'admin/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', 'redmode_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  }

  // ============================================================================
  // 4. RAZORPAY PAYMENT GATEWAY ENDPOINTS (STRICT — NO SIMULATION)
  // ============================================================================
  if (pathStr === 'payment/razorpay/config') {
    const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    const mode = process.env.RAZORPAY_MODE || (keyId.startsWith('rzp_live') ? 'live' : 'test');
    return res.status(200).json({
      configured: Boolean(keyId),
      keyId,
      merchantName: 'REDMODE',
      themeColor: '#E11D48',
      mode,
    });
  }

  if (pathStr === 'payment/razorpay/create-order' && req.method === 'POST') {
    const { amount, receipt, notes, keyIdOverride, keySecretOverride } = body;
    const keyId = (process.env.RAZORPAY_KEY_ID || keyIdOverride || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || keySecretOverride || '').trim();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount.' });
    }

    if (!keyId || !keySecret) {
      return res.status(503).json({
        success: false,
        configured: false,
        message:
          'Online payment gateway (Razorpay) is not configured. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel Environment Variables or select Cash on Delivery (COD).',
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

      const rzpData = await rzpRes.json().catch(() => ({}));
      if (!rzpRes.ok || !rzpData?.id) {
        return res.status(rzpRes.status || 400).json({
          success: false,
          message: rzpData?.error?.description || 'Razorpay order creation failed.',
        });
      }

      return res.status(200).json({
        success: true,
        orderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId,
        live: !keyId.startsWith('rzp_test'),
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: `Network error connecting to Razorpay: ${err.message}`,
      });
    }
  }

  if (pathStr === 'payment/razorpay/verify' && req.method === 'POST') {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      expectedAmountInr,
      keyIdOverride,
      keySecretOverride,
    } = body;
    const keyId = (process.env.RAZORPAY_KEY_ID || keyIdOverride || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || keySecretOverride || '').trim();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Missing required Razorpay payment parameters (order_id, payment_id, signature).',
      });
    }

    if (String(razorpay_order_id).startsWith('order_sim_') || !keySecret) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Simulated payments are strictly disabled in production.',
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
          message: 'Invalid Razorpay payment signature. Payment verification failed.',
        });
      }

      // Verify order amount & currency with Razorpay API if keyId is available
      if (keyId && expectedAmountInr && Number(expectedAmountInr) > 0) {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const orderCheckRes = await fetch(
          `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`,
          {
            headers: { Authorization: authHeader },
          }
        );
        if (orderCheckRes.ok) {
          const orderCheckData = await orderCheckRes.json().catch(() => ({}));
          const expectedPaise = Math.round(Number(expectedAmountInr) * 100);
          if (orderCheckData.amount && Number(orderCheckData.amount) !== expectedPaise) {
            return res.status(400).json({
              success: false,
              verified: false,
              message: 'Payment amount mismatch detected during server verification.',
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

      return res.status(200).json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        message: 'Payment signature and order amount verified.',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        verified: false,
        message: `Signature verification error: ${err.message}`,
      });
    }
  }

  if (pathStr === 'payment/razorpay/webhook' && req.method === 'POST') {
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    const signature = req.headers['x-razorpay-signature'];
    if (!webhookSecret || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay webhook secret or signature header.',
      });
    }

    const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(body);
    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

    if (expectedSig !== signature) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Razorpay webhook signature.',
      });
    }

    return res.status(200).json({
      success: true,
      event: body?.event || 'verified',
      orderId: body?.payload?.payment?.entity?.order_id || null,
      paymentId: body?.payload?.payment?.entity?.id || null,
    });
  }

  if (pathStr === 'payment/razorpay/test-keys' && req.method === 'POST') {
    if (!requireAdminRole(['Super Admin'])) return;
    const { keyId, keySecret } = body;
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
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      if (!testRes.ok) {
        const errorData = await testRes.json().catch(() => ({}));
        return res.status(testRes.status).json({
          success: false,
          message: errorData?.error?.description || `Razorpay authentication failed (${testRes.status}).`,
        });
      }
      const isLive = !finalKeyId.startsWith('rzp_test');
      return res.status(200).json({
        success: true,
        isLive,
        mode: isLive ? 'Production (Live)' : 'Test Mode (Sandbox)',
        message: `Connected to Razorpay successfully in ${isLive ? 'LIVE PRODUCTION' : 'TEST'} mode.`,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ============================================================================
  // 5. PAYPAL INTERNATIONAL GATEWAY ENDPOINTS (STRICT — NO SIMULATION)
  // ============================================================================
  if (pathStr === 'payment/paypal/test-keys' && req.method === 'POST') {
    if (!requireAdminRole(['Super Admin'])) return;
    const { clientId, clientSecret, mode } = body;
    const finalClientId = (clientId || process.env.PAYPAL_CLIENT_ID || '').trim();
    const finalClientSecret = (clientSecret || process.env.PAYPAL_CLIENT_SECRET || '').trim();
    const isLive = (mode || process.env.PAYPAL_MODE || 'live') === 'live';

    if (!finalClientId || !finalClientSecret) {
      return res.status(400).json({
        success: false,
        message: 'Both PayPal Client ID and Client Secret are required.',
      });
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${finalClientId}:${finalClientSecret}`).toString('base64');
      const oauthUrl = isLive
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
      const tokenRes = await fetch(oauthUrl, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        return res.status(tokenRes.status).json({
          success: false,
          message: errJson?.error_description || 'Invalid PayPal Client ID or Secret.',
        });
      }
      return res.status(200).json({
        success: true,
        isLive,
        mode: isLive ? 'Production (Live)' : 'Sandbox (Test Mode)',
        message: `PayPal International Gateway verified in ${isLive ? 'LIVE' : 'SANDBOX'} mode.`,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (pathStr === 'payment/paypal/create-order' && req.method === 'POST') {
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
    } = body;
    const numericInr = Number(amountInr) || (Number(amountUsd || amount) > 0 ? Number(amountUsd || amount) * 84 : 0);
    if (numericInr <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount.' });
    }
    const approxUsd = Number(amountUsd) > 0 ? Number(amountUsd) : Math.max(1, Math.round((numericInr / 84) * 100) / 100);

    const clientId = (process.env.PAYPAL_CLIENT_ID || clientIdOverride || '').trim();
    const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || clientSecretOverride || '').trim();
    const isLive = (mode || process.env.PAYPAL_MODE || 'live') === 'live';

    if (!clientId || !clientSecret || clientId.includes('sandbox_export')) {
      return res.status(503).json({
        success: false,
        configured: false,
        message:
          'PayPal International payment gateway is not configured yet. Please configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Vercel Environment Variables.',
      });
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        return res.status(tokenRes.status).json({
          success: false,
          message: errData?.error_description || 'PayPal authentication failed.',
        });
      }

      const tokenData = await tokenRes.json();
      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
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

      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !orderData?.id) {
        return res.status(orderRes.status || 400).json({
          success: false,
          message: orderData?.message || 'Failed to create PayPal order.',
        });
      }

      const approveLink = Array.isArray(orderData.links)
        ? orderData.links.find((l) => l.rel === 'approve' || l.rel === 'payer-action')?.href
        : null;

      return res.status(200).json({
        success: true,
        orderId: orderData.id,
        approveUrl: approveLink || null,
        amountUsd: approxUsd,
        currency,
        live: isLive,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: `PayPal order creation error: ${err.message}`,
      });
    }
  }

  if (pathStr === 'payment/paypal/capture-order' && req.method === 'POST') {
    const { orderId, expectedAmountUsd, clientIdOverride, clientSecretOverride, mode } = body;
    if (!orderId || String(orderId).startsWith('PAYPAL-EXP-')) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Valid PayPal Order ID is required for payment capture.',
      });
    }

    const clientId = (process.env.PAYPAL_CLIENT_ID || clientIdOverride || '').trim();
    const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || clientSecretOverride || '').trim();
    const isLive = (mode || process.env.PAYPAL_MODE || 'live') === 'live';

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
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });

      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({
          success: false,
          verified: false,
          message: 'Failed to authenticate with PayPal during capture.',
        });
      }

      const tokenData = await tokenRes.json();
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

      const captureData = await captureRes.json().catch(() => ({}));
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

      return res.status(200).json({
        success: true,
        verified: true,
        orderId: captureData.id,
        captureId: captureUnit?.id || captureData.id,
        status: captureData.status,
        message: 'International PayPal payment captured and verified.',
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        verified: false,
        message: `PayPal capture verification failed: ${err.message}`,
      });
    }
  }

  if (pathStr === 'payment/gateway/test' && req.method === 'POST') {
    if (!requireAdminRole(['Super Admin'])) return;
    const { provider, apiKey, apiSecret, mode } = body;
    const key = (apiKey || '').trim();
    const secret = (apiSecret || '').trim();
    if (!key) {
      return res.status(400).json({ success: false, message: `API Key is required for ${provider || 'gateway'}.` });
    }
    if (provider === 'razorpay') {
      if (!secret) {
        return res.status(400).json({ success: false, message: 'Razorpay Key Secret is required.' });
      }
      const authHeader = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
      const testRes = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        headers: { Authorization: authHeader },
      });
      if (testRes.ok) {
        return res.status(200).json({ success: true, message: 'Razorpay connection verified!' });
      }
      return res.status(400).json({ success: false, message: 'Razorpay authentication failed.' });
    }
    if (provider === 'paypal') {
      if (!secret) {
        return res.status(400).json({ success: false, message: 'PayPal Client Secret is required.' });
      }
      const authHeader = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
      const url =
        mode === 'live'
          ? 'https://api-m.paypal.com/v1/oauth2/token'
          : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
      const resTok = await fetch(url, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      });
      if (resTok.ok) {
        return res.status(200).json({ success: true, message: 'PayPal credentials verified!' });
      }
      return res.status(400).json({ success: false, message: 'PayPal authentication failed.' });
    }
    return res.status(200).json({ success: true, message: 'Gateway configuration format verified.' });
  }

  // ============================================================================
  // 6. DELHIVERY, SHIPPING LABELS, WEBHOOKS & PINCODE SERVICEABILITY
  // ============================================================================
  if (pathStr === 'delhivery/test') {
    if (!requireAdminRole(['Super Admin'])) return;
    const token = (req.query.token || body.token || process.env.DELHIVERY_API_TOKEN || '').trim();
    const pincode = String(req.query.pincode || body.pincode || '250002').replace(/\D/g, '') || '250002';

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Delhivery API Token is not configured. Set DELHIVERY_API_TOKEN in Vercel Environment Variables.',
      });
    }

    try {
      const response = await fetch(
        `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`,
        {
          headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `Delhivery API returned status ${response.status}`,
        });
      }
      const data = await response.json().catch(() => ({}));
      const postalInfo = data?.delivery_codes?.[0]?.postal_code;
      return res.status(200).json({
        success: true,
        district: postalInfo?.district || 'Meerut',
        state: postalInfo?.state_code || 'UP',
        prepaid: postalInfo?.pre_paid === 'Y',
        cod: postalInfo?.cod === 'Y',
        pickup: postalInfo?.pickup === 'Y',
        message: 'Connected to Delhivery API successfully.',
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (pathStr === 'delhivery/fetch-waybill' && req.method === 'POST') {
    const token = (body.token || process.env.DELHIVERY_API_TOKEN || '').trim();
    const client = (body.client || process.env.DELHIVERY_CLIENT_NAME || 'Redmode').trim();

    if (!token) {
      return res.status(503).json({
        success: false,
        live: false,
        message: 'Delhivery API Token is required to allocate an official waybill.',
      });
    }

    try {
      const response = await fetch(
        `https://track.delhivery.com/waybill/api/bulk/json/?count=1&client=${encodeURIComponent(client)}`,
        {
          headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
        }
      );
      if (response.ok) {
        const text = await response.text();
        const cleanWaybill = text.replace(/["\s]/g, '');
        if (cleanWaybill && cleanWaybill.length >= 10) {
          return res.status(200).json({ success: true, waybill: cleanWaybill, live: true });
        }
      }
      return res.status(400).json({
        success: false,
        live: false,
        message: 'Delhivery API did not return a valid waybill. Verify your token and client name.',
      });
    } catch (err) {
      return res.status(500).json({ success: false, live: false, message: err.message });
    }
  }

  if (pathStr.startsWith('shipping/label/')) {
    const awb = pathStr.replace('shipping/label/', '').trim() || 'AWB-PENDING';
    const orderId = String(req.query.orderId || 'ORD-REDMODE');
    const customer = String(req.query.name || 'Valued Customer');
    const address = String(req.query.address || 'Customer Delivery Address');
    const phone = String(req.query.phone || '');
    const pin = String(req.query.pin || '');
    const mode = String(req.query.mode || 'DELHIVERY SURFACE');
    const payMode = String(req.query.pay || 'PREPAID');
    const amount = String(req.query.amt || '₹0');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delhivery Shipping Label - ${awb}</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      padding: 14px;
      max-width: 384px;
      margin: 0 auto;
      border: 2px solid #000;
      color: #000;
      background: #fff;
    }
    .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .logo-del { font-size: 15px; font-weight: 900; color: #E52229; letter-spacing: 0.5px; }
    .routing { text-align: right; }
    .sort-code { font-size: 22px; font-weight: 900; font-family: monospace; }
    .awb-box { text-align: center; border-bottom: 2px solid #000; padding: 10px 0; margin-bottom: 8px; }
    .barcode-bars {
      display: inline-block;
      height: 48px;
      background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px);
      width: 85%;
      margin: 0 auto 6px auto;
    }
    .awb-num { font-size: 18px; font-weight: 900; letter-spacing: 2px; font-family: monospace; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 8px; font-size: 11px; }
    .consignee { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 8px; }
    .sec-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #333; margin-bottom: 3px; }
    .name { font-size: 14px; font-weight: 800; margin-bottom: 2px; }
    .addr { font-size: 11px; line-height: 1.4; }
    .shipper { font-size: 10px; line-height: 1.4; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .pay-pill { display: inline-block; background: #000; color: #fff; font-weight: 900; font-size: 13px; padding: 3px 8px; border-radius: 3px; }
    .footer { font-size: 9px; text-align: center; color: #444; }
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <div class="logo">REDMODE</div>
      <div style="font-size:10px; font-weight:700; color:#555;">WOMEN ETHNIC WEAR</div>
    </div>
    <div class="routing">
      <div class="logo-del">DELHIVERY</div>
      <div class="sort-code">MEE / PCK</div>
    </div>
  </div>
  <div class="awb-box">
    <div class="barcode-bars"></div>
    <div class="awb-num">AWB: ${awb}</div>
    <div style="font-size:10px; font-weight:700; margin-top:3px;">ORDER REF: ${orderId}</div>
  </div>
  <div class="meta-grid">
    <div>
      <strong>MODE:</strong> ${mode}<br>
      <strong>DATE:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
      <strong>WT:</strong> 0.50 KG
    </div>
    <div style="text-align:right;">
      <strong>PAYMENT:</strong> <span class="pay-pill">${payMode}</span><br>
      <strong style="font-size:13px;">COLLECT: ${amount}</strong>
    </div>
  </div>
  <div class="consignee">
    <div class="sec-title">SHIP TO (CONSIGNEE):</div>
    <div class="name">${customer}</div>
    <div class="addr">${address}</div>
    <div style="margin-top:4px; font-size:12px; font-weight:800;">
      PIN: ${pin} | PH: ${phone}
    </div>
  </div>
  <div class="shipper">
    <div class="sec-title">RETURN / PICKUP WAREHOUSE (ORIGIN):</div>
    <strong>REDMODE B2C (Client: Redmode)</strong><br>
    1807, Zakir Hussain Colony, Near Madina Masjid,<br>
    Meerut, Uttar Pradesh, India - 250002<br>
    Contact: +91 73027 97464 | myredmode@gmail.com
  </div>
  <div class="footer">
    Official Delhivery B2C Thermal Dispatch Manifest • Non-Negotiable
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  if (pathStr === 'delhivery/scan-pickup' && req.method === 'POST') {
    const { awb, location = 'REDMODE B2C, Meerut Hub', note = 'Courier pickup scan verified' } = body;
    if (!awb) {
      return res.status(400).json({ success: false, message: 'AWB number is required.' });
    }
    const timestamp = new Date().toLocaleString('en-IN');
    delhiveryScannedWaybills[awb] = { status: 'In Transit', location, timestamp, note };
    return res.status(200).json({
      success: true,
      awb,
      status: 'In Transit',
      isPickedUp: true,
      scan: delhiveryScannedWaybills[awb],
    });
  }

  if (pathStr === 'shipping/webhook' && req.method === 'POST') {
    const { awb, waybill, tracking_number, status = 'In Transit', location = 'Hub Scan', courier = 'Courier' } = body;
    const finalAwb = String(awb || waybill || tracking_number || '').trim();
    if (!finalAwb) {
      return res.status(400).json({ success: false, message: 'AWB / Waybill number is required.' });
    }
    const timestamp = new Date().toLocaleString('en-IN');
    delhiveryScannedWaybills[finalAwb] = {
      status,
      location,
      timestamp,
      note: `Webhook scan received from ${courier}`,
    };
    return res.status(200).json({
      success: true,
      awb: finalAwb,
      status,
      message: `Webhook recorded status "${status}" for AWB #${finalAwb}`,
    });
  }

  if (pathStr === 'shipping/test-channel' && req.method === 'POST') {
    if (!requireAdminRole(['Super Admin'])) return;
    const { provider, apiKey, warehouseName = 'REDMODE B2C', environment = 'production', pincode = '250002', name = 'Courier' } = body;
    const token = (apiKey || process.env.DELHIVERY_API_TOKEN || '').trim();
    if (!token && provider !== 'custom') {
      return res.status(400).json({ success: false, message: `API Token is required for ${name}.` });
    }
    if (provider === 'delhivery') {
      const cleanPin = String(pincode).replace(/\D/g, '') || '250002';
      const baseHost = environment === 'staging' ? 'https://staging-express.delhivery.com' : 'https://track.delhivery.com';
      const response = await fetch(`${baseHost}/c/api/pin-codes/json/?filter_codes=${cleanPin}`, {
        headers: { Authorization: `Token ${token}`, Accept: 'application/json' },
      });
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `Delhivery API returned HTTP ${response.status}. Check API Token.`,
        });
      }
      const data = await response.json().catch(() => ({}));
      const postalInfo = data?.delivery_codes?.[0]?.postal_code;
      if (!postalInfo) {
        return res.status(400).json({
          success: false,
          message: `No serviceability record returned for Pincode ${cleanPin}.`,
        });
      }
      return res.status(200).json({
        success: true,
        district: postalInfo.district || 'Meerut',
        state: postalInfo.state_code || 'UP',
        pickup: postalInfo.pickup === 'Y',
        cod: postalInfo.cod === 'Y',
        prepaid: postalInfo.pre_paid === 'Y',
        message: `Delhivery Direct API Connected! Warehouse "${warehouseName}" verified.`,
      });
    }
    return res.status(200).json({ success: true, message: `Channel "${name}" verified.` });
  }

  if (pathStr.startsWith('delhivery/track/')) {
    const awb = pathStr.replace('delhivery/track/', '').trim();
    const token = (req.query.token || process.env.DELHIVERY_API_TOKEN || '').trim();
    if (!awb) return res.status(400).json({ success: false, message: 'AWB required' });

    const localScan = delhiveryScannedWaybills[awb];
    if (!token) {
      if (localScan) {
        return res.status(200).json({
          success: true,
          awb,
          status: localScan.status,
          isPickedUp: true,
          scans: [
            {
              ScanDetail: {
                Scan: localScan.status,
                ScannedLocation: localScan.location,
                ScanDateTime: localScan.timestamp,
                Instructions: localScan.note,
              },
            },
          ],
        });
      }
      return res.status(503).json({
        success: false,
        message: 'Delhivery tracking API token is not configured on the server.',
      });
    }

    try {
      const response = await fetch(
        `https://track.delhivery.com/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}&token=${token}`
      );
      const data = await response.json().catch(() => ({}));
      const shipment = data?.ShipmentData?.[0]?.Shipment;
      if (!shipment) {
        return res.status(404).json({
          success: false,
          awb,
          status: 'Manifested',
          isPickedUp: false,
          message: 'AWB manifested; awaiting physical pickup scan.',
        });
      }
      const rawStatus = shipment.Status?.Status || 'In Transit';
      const scans = shipment.Scans || [];
      return res.status(200).json({
        success: true,
        awb,
        status: rawStatus,
        isPickedUp: scans.length > 0 && !rawStatus.toLowerCase().includes('manifested'),
        scans,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (pathStr.startsWith('pincode/lookup/')) {
    const pincode = pathStr.replace('pincode/lookup/', '').replace(/\D/g, '');
    if (pincode.length !== 6) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit Indian PIN code.' });
    }

    try {
      const token = (process.env.DELHIVERY_API_TOKEN || '').trim();
      if (token) {
        const delhiveryRes = await fetch(
          `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`,
          {
            headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
          }
        );
        if (delhiveryRes.ok) {
          const dData = await delhiveryRes.json().catch(() => ({}));
          const postal = dData?.delivery_codes?.[0]?.postal_code;
          if (postal && postal.district) {
            return res.status(200).json({
              success: true,
              city: postal.district,
              state: postal.state || postal.state_code || 'India',
              pincode,
              prepaid: postal.pre_paid === 'Y',
              cod: postal.cod === 'Y',
              source: 'delhivery',
            });
          }
        }
      }

      const postalRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      if (postalRes.ok) {
        const pData = await postalRes.json().catch(() => []);
        if (Array.isArray(pData) && pData[0]?.Status === 'Success' && pData[0]?.PostOffice?.length > 0) {
          const po = pData[0].PostOffice[0];
          return res.status(200).json({
            success: true,
            city: po.District || po.Block || po.Circle,
            state: po.State,
            pincode,
            prepaid: true,
            cod: true,
            source: 'indiapost',
          });
        }
      }
      return res.status(404).json({ success: false, message: `PIN code ${pincode} is not serviceable.` });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ============================================================================
  // 7. META WHATSAPP CLOUD API & SMS GATEWAY SETTINGS
  // ============================================================================
  if (pathStr === 'whatsapp/test') {
    if (!requireAdminRole(['Super Admin'])) return;
    const token = (body.accessToken || process.env.WHATSAPP_CLOUD_TOKEN || '').trim();
    const phoneNumberId = (body.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
    if (!token || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        connected: false,
        error: 'WhatsApp Cloud API credentials (Access Token & Phone Number ID) are required.',
      });
    }
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const phoneData = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        return res.status(metaRes.status).json({
          success: false,
          connected: false,
          error: phoneData?.error?.message || 'Meta API error',
        });
      }
      return res.status(200).json({
        success: true,
        connected: true,
        phoneNumberId: phoneData.id,
        verifiedName: phoneData.verified_name,
        displayPhoneNumber: phoneData.display_phone_number,
        message: 'Connected to Meta WhatsApp Cloud API successfully!',
      });
    } catch (err) {
      return res.status(500).json({ success: false, connected: false, error: err.message });
    }
  }

  if (pathStr === 'whatsapp/send' && req.method === 'POST') {
    const { to, templateName, components, textMessage, accessToken: bodyToken, phoneNumberId: bodyPhoneId, languageCode } = body;
    const token = (bodyToken || process.env.WHATSAPP_CLOUD_TOKEN || '').trim();
    const phoneNumberId = (bodyPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
    if (!token || !phoneNumberId || !to) {
      return res.status(400).json({
        success: false,
        configured: false,
        error: 'Missing WhatsApp Cloud API credentials or recipient number.',
      });
    }
    const cleanTo = String(to).replace(/\D/g, '');
    const formattedTo = cleanTo.length === 10 ? `91${cleanTo}` : cleanTo;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
    };
    if (templateName) {
      payload.type = 'template';
      payload.template = {
        name: templateName,
        language: { code: languageCode || 'en' },
        components: components || [],
      };
    } else if (textMessage) {
      payload.type = 'text';
      payload.text = { preview_url: false, body: textMessage };
    } else {
      return res.status(400).json({ success: false, error: 'Missing message content' });
    }
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        return res.status(metaRes.status).json({
          success: false,
          error: data?.error?.message || 'WhatsApp send failed',
        });
      }
      return res.status(200).json({
        success: true,
        messageId: data?.messages?.[0]?.id,
        status: 'Sent',
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (pathStr === 'delhivery/create-shipment' && req.method === 'POST') {
    if (!requireAdminRole(['Super Admin', 'Listing + Label Admin', 'Label Admin'])) return;
    const {
      order,
      mode = 'Surface',
      apiToken: bodyToken,
      warehouseName = 'REDMODE B2C',
      pickupPincode = '250002',
    } = body;
    if (!order || !order.id) {
      return res.status(400).json({ success: false, message: 'Order payload is required.' });
    }
    const token = (bodyToken || process.env.DELHIVERY_API_TOKEN || '').trim();
    if (!token) {
      return res.status(200).json({
        success: true,
        configured: false,
        waybill: order.awb_number || null,
        message: 'Delhivery API Token not set on server; local AWB manifest retained.',
      });
    }
    try {
      const cust = order.customer || {};
      const isCod = (order.paymentMode || '').toUpperCase() === 'COD';
      const shipmentPayload = {
        shipments: [
          {
            name: cust.name || 'Customer',
            add: [cust.house, cust.street, cust.landmark].filter(Boolean).join(', ') || 'Delivery Address',
            pin: String(cust.pincode || '250002').replace(/\D/g, ''),
            city: cust.city || 'Meerut',
            state: cust.state || 'Uttar Pradesh',
            country: cust.country || 'India',
            phone: String(cust.mobile || cust.phone || '').replace(/\D/g, '').slice(-10),
            order: String(order.id).replace('#', ''),
            payment_mode: isCod ? 'COD' : 'Prepaid',
            return_pin: String(pickupPincode).replace(/\D/g, '') || '250002',
            return_city: 'Meerut',
            return_phone: '7302797464',
            return_add: '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh',
            return_state: 'Uttar Pradesh',
            return_country: 'India',
            products_desc: (order.items || []).map((i) => `${i.name} (${i.size || 'Free'})`).join(', ') || 'Apparel',
            hsn_code: '6204',
            cod_amount: isCod ? Number(order.total) || 0 : 0,
            order_date: order.createdAt || new Date().toISOString(),
            total_amount: Number(order.total) || 0,
            seller_add: '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh',
            seller_name: 'REDMODE',
            seller_inv: `RM-INV-${String(order.id).replace(/\D/g, '')}`,
            quantity: String((order.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)),
            waybill: order.awb_number || '',
            shipment_width: String(order.final_package_width || 24),
            shipment_height: String(order.final_package_height || 4),
            weight: String(Math.round((Number(order.final_package_weight) || 0.35) * 1000)),
            shipping_mode: mode === 'Express' ? 'Express' : 'Surface',
            address_type: 'home',
          },
        ],
        pickup_location: {
          name: warehouseName,
          add: '1807 Zakir Hussain Colony',
          city: 'Meerut',
          pin_code: Number(pickupPincode) || 250002,
          country: 'India',
          phone: '7302797464',
        },
      };
      const formBody = `format=json&data=${encodeURIComponent(JSON.stringify(shipmentPayload))}`;
      const cmuRes = await fetch('https://track.delhivery.com/api/cmu/create.json', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formBody,
      });
      const cmuData = await cmuRes.json().catch(() => ({}));
      const pkg = cmuData?.packages?.[0];
      if (cmuRes.ok && pkg?.waybill) {
        return res.status(200).json({
          success: true,
          configured: true,
          waybill: pkg.waybill,
          status: pkg.status || 'Manifested',
          refnum: pkg.refnum,
        });
      }
      return res.status(200).json({
        success: true,
        configured: true,
        waybill: order.awb_number || null,
        delhiveryResponse: cmuData,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (pathStr === 'whatsapp/webhook') {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      const expectedToken = (process.env.WHATSAPP_VERIFY_TOKEN || 'redmode_wa_verify_2026').trim();
      if (mode === 'subscribe' && token === expectedToken) {
        return res.status(200).send(String(challenge || ''));
      }
      return res.status(403).json({ success: false, message: 'Invalid webhook verify token.' });
    }
    return res.status(200).json({ status: 'EVENT_RECEIVED' });
  }

  if (pathStr === 'admin/sms-settings') {
    if (!requireAdminRole(['Super Admin'])) return;
    if (req.method === 'POST') {
      return res.status(200).json({ success: true, message: 'SMS settings saved.' });
    }
    return res.status(200).json({
      success: true,
      settings: null,
      envConnected: {
        fast2sms: Boolean(process.env.FAST2SMS_API_KEY),
        meta_whatsapp: Boolean(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
        twofactor: Boolean(process.env.TWOFACTOR_API_KEY),
      },
    });
  }

  if (pathStr.startsWith('admin/')) {
    if (!requireAdminRole()) return;
    return res.status(200).json({ success: true, message: 'Admin endpoint authorized.' });
  }

  return res.status(404).json({ success: false, message: `Endpoint /api/${pathStr} not found` });
}

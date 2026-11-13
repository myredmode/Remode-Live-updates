export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const rawMobile = body.mobile || '';
  const cleanMobile = String(rawMobile).replace(/\D/g, '').slice(-10);

  if (cleanMobile.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid 10-digit Indian mobile number.',
    });
  }

  let testOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const gw = body.gatewayConfig;
  if (gw?.provider === 'meta_whatsapp') {
    const token = (gw?.accessToken || process.env.WHATSAPP_CLOUD_TOKEN || '').trim();
    const phoneId = (gw?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1375149605673144').trim();
    const templateName = (gw?.templateName || 'redmode_otp_verification').trim();
    const languageCode = (gw?.languageCode || 'en_US').trim();

    if (token && phoneId) {
      try {
        let waRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: `91${cleanMobile}`,
            type: 'template',
            template: {
              name: templateName,
              language: { code: languageCode },
              components: [
                { type: 'body', parameters: [{ type: 'text', text: testOtp }] },
                { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: testOtp }] },
              ],
            },
          }),
        });
        let waData = await waRes.json().catch(() => ({}));

        if (!waRes.ok) {
          waRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: `91${cleanMobile}`,
              type: 'template',
              template: {
                name: templateName,
                language: { code: languageCode },
                components: [{ type: 'body', parameters: [{ type: 'text', text: testOtp }] }],
              },
            }),
          });
          waData = await waRes.json().catch(() => ({}));
        }

        if (waRes.ok && waData.messages?.[0]?.id) {
          return res.status(200).json({
            success: true,
            channel: 'whatsapp',
            message: `WhatsApp OTP sent to +91 ${cleanMobile} successfully! Message ID: ${waData.messages[0].id}`,
          });
        }
      } catch {
        // Fallback below
      }
    }
  }

  const tfKey = (gw?.apiKey || process.env.TWOFACTOR_API_KEY || '').trim();
  if (!tfKey) {
    return res.status(503).json({
      success: false,
      message: 'SMS gateway is not configured. Please set TWOFACTOR_API_KEY or WHATSAPP_CLOUD_TOKEN in environment variables.',
    });
  }

  try {
    let tfRes = await fetch(`https://2factor.in/API/V1/${tfKey}/SMS/+91${cleanMobile}/AUTOGEN2`);
    let tfData = await tfRes.json().catch(() => ({}));

    if (!tfRes.ok || tfData.Status !== 'Success') {
      tfRes = await fetch(`https://2factor.in/API/V1/${tfKey}/SMS/+91${cleanMobile}/${testOtp}`);
      tfData = await tfRes.json().catch(() => ({}));
    }

    if (tfRes.ok && tfData.Status === 'Success') {
      return res.status(200).json({
        success: true,
        channel: '2factor',
        message: `2Factor.in OTP dispatched to +91 ${cleanMobile} successfully! Session: ${tfData.Details}`,
      });
    }
  } catch (err) {
    // Error handled below
  }

  return res.status(502).json({
    success: false,
    message: `Failed to deliver OTP to +91 ${cleanMobile} via configured gateway.`,
  });
}

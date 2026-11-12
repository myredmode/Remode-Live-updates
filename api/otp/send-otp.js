export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-role');

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

  let generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const smsSettings = body.smsSettings;
  const metaGw = smsSettings?.gateways?.find((g) => g.provider === 'meta_whatsapp');
  const tfGw = smsSettings?.gateways?.find((g) => g.provider === 'twofactor');

  const sendViaMeta = async (gw) => {
    const token = (gw?.accessToken || process.env.WHATSAPP_CLOUD_TOKEN || '').trim();
    const phoneId = (gw?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1375149605673144').trim();
    const templateName = (gw?.templateName || 'redmode_otp_verification').trim();
    const languageCode = (gw?.languageCode || 'en_US').trim();
    if (!token || !phoneId) return false;

    try {
      // 1. Try Authentication Template with Copy Code button
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
              { type: 'body', parameters: [{ type: 'text', text: generatedOtp }] },
              { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: generatedOtp }] },
            ],
          },
        }),
      });
      let waData = await waRes.json().catch(() => ({}));
      if (waRes.ok && waData.messages?.[0]?.id) return true;

      // 2. Try Template with body-only parameter
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
            components: [{ type: 'body', parameters: [{ type: 'text', text: generatedOtp }] }],
          },
        }),
      });
      waData = await waRes.json().catch(() => ({}));
      if (waRes.ok && waData.messages?.[0]?.id) return true;

      // 3. Fallback to free-form text message
      waRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${cleanMobile}`,
          type: 'text',
          text: {
            body: `*REDMODE Official Store*\n\nYour Customer Login OTP is: *${generatedOtp}*\n\nValid for 10 minutes. Do not share this code with anyone.`,
          },
        }),
      });
      waData = await waRes.json().catch(() => ({}));
      return Boolean(waRes.ok && waData.messages?.[0]?.id);
    } catch {
      return false;
    }
  };

  const sendViaTwoFactor = async (gw) => {
    const twoFactorKey = (gw?.apiKey || process.env.TWOFACTOR_API_KEY || '699e72b1-de86-11f1-bb6c-0200cd936042').trim();
    if (!twoFactorKey) return false;
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
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const primaryProvider = smsSettings?.primaryProvider || 'meta_whatsapp';
  if (primaryProvider === 'meta_whatsapp') {
    if (await sendViaMeta(metaGw)) {
      return res.status(200).json({
        success: true,
        simulated: false,
        fallbackOtp: generatedOtp,
        verificationCode: generatedOtp,
        channel: 'whatsapp',
        message: `OTP has been sent to +91 ${cleanMobile} via Meta WhatsApp.`,
      });
    }
    if (await sendViaTwoFactor(tfGw)) {
      return res.status(200).json({
        success: true,
        simulated: false,
        fallbackOtp: generatedOtp,
        verificationCode: generatedOtp,
        channel: '2factor',
        message: `OTP has been sent to +91 ${cleanMobile} via 2FACTOR.`,
      });
    }
  } else {
    if (await sendViaTwoFactor(tfGw)) {
      return res.status(200).json({
        success: true,
        simulated: false,
        fallbackOtp: generatedOtp,
        verificationCode: generatedOtp,
        channel: '2factor',
        message: `OTP has been sent to +91 ${cleanMobile} via 2FACTOR.`,
      });
    }
    if (await sendViaMeta(metaGw)) {
      return res.status(200).json({
        success: true,
        simulated: false,
        fallbackOtp: generatedOtp,
        verificationCode: generatedOtp,
        channel: 'whatsapp',
        message: `OTP has been sent to +91 ${cleanMobile} via Meta WhatsApp.`,
      });
    }
  }

  return res.status(200).json({
    success: true,
    simulated: true,
    fallbackOtp: generatedOtp,
    verificationCode: generatedOtp,
    channel: 'sandbox',
    message: `Instant OTP generated for +91 ${cleanMobile}: ${generatedOtp}`,
  });
}

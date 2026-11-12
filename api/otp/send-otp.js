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
  const tfGw = smsSettings?.gateways?.find((g) => g.provider === 'twofactor');
  const twoFactorKey = (tfGw?.apiKey || process.env.TWOFACTOR_API_KEY || '699e72b1-de86-11f1-bb6c-0200cd936042').trim();

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
      return res.status(200).json({
        success: true,
        simulated: false,
        verificationCode: generatedOtp,
        channel: '2factor',
        message: `OTP has been sent to +91 ${cleanMobile} via 2FACTOR.`,
      });
    }
  } catch (err) {
    // Fallback below
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

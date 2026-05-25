export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, grant_type, refresh_token, redirect_uri, action } = req.body || {};
  const client_id = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const client_secret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;

  if (!client_id || !client_secret) return res.status(500).json({ error: 'Google Health credentials not configured' });

  // Safe: expose client_id only (never client_secret)
  if (action === 'client_id') return res.status(200).json({ client_id });

  try {
    const params = grant_type === 'refresh_token'
      ? { client_id, client_secret, grant_type: 'refresh_token', refresh_token }
      : { client_id, client_secret, code, grant_type: 'authorization_code', redirect_uri };

    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    });
    const data = await r.json();
    if (!r.ok) return res.status(400).json({ error: data.error_description || 'Token exchange failed' });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

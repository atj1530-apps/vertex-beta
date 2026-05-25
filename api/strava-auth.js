export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, grant_type, refresh_token } = req.body || {};
  const client_id = process.env.STRAVA_CLIENT_ID;
  const client_secret = process.env.STRAVA_CLIENT_SECRET;

  if (!client_id || !client_secret) return res.status(500).json({ error: 'Strava credentials not configured' });

  try {
    const body = grant_type === 'refresh_token'
      ? { client_id, client_secret, grant_type: 'refresh_token', refresh_token }
      : { client_id, client_secret, code, grant_type: 'authorization_code' };

    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) return res.status(400).json({ error: data.message || 'Token exchange failed' });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

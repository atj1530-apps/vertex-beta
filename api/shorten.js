export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const token = process.env.BITLY_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token not configured' });

  try {
    const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ long_url: url })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.message || 'Bitly error' });
    return res.status(200).json({ short_url: data.link });
  } catch (e) {
    return res.status(500).json({ error: 'Request failed' });
  }
}

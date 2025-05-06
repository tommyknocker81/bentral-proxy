export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 🔥 Manually read the body as a stream
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();
    const parsedBody = JSON.parse(rawBody);

    const response = await fetch('https://www.bentral.com/api/properties/units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: parsedBody.apiKey
      })
    });

    const data = await response.json();

    if (!data.units) {
      console.error("❌ Unexpected Bentral response:", data);
      return res.status(500).json({ error: 'Unexpected response from Bentral', raw: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ Proxy fetch failed:', error);
    return res.status(500).json({ error: 'Proxy failed to fetch from Bentral' });
  }
}

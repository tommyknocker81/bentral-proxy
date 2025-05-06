export default async function handler(req, res) {
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
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();
    const parsedBody = JSON.parse(rawBody);

    const bentralResponse = await fetch('https://www.bentral.com/api/properties/get-units', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: parsedBody.apiKey
      }),
    });

    const text = await bentralResponse.text();

    if (!bentralResponse.ok) {
      console.error("❌ Bentral API error:", bentralResponse.status, text);
      return res.status(500).json({
        error: 'Bentral responded with error',
        status: bentralResponse.status,
        body: text
      });
    }

    const data = JSON.parse(text);
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Proxy fetch failed:', error);
    return res.status(500).json({ error: 'Proxy failed to fetch from Bentral', details: error.message });
  }
}

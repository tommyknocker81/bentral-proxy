export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { propertyId } = req.query;

  if (!propertyId) {
    return res.status(400).json({ error: "Missing propertyId in query." });
  }

  try {
    const response = await fetch(`https://api.bentral.com/v1/properties/${propertyId}/units?fields=id,official_name`, {
      headers: {
        'Authorization': 'Bearer 21ae35bd32df3d14e889cfb95ab3f3f6'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from Bentral", raw: data });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Proxy failed", details: error.message });
  }
}

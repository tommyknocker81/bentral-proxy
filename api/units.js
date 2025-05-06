export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const propertyId = '5f6a41324d415f4e';
  const apiKey = '21ae35bd32df3d14e889cfb95ab3f3f6';

  try {
    const response = await fetch(`https://api.bentral.com/v1/properties/${propertyId}/units?fields=id,unofficial_name`, {
      headers: { 'x-api-key': apiKey }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Bentral responded with error', raw: data });
    }

    const units = {};
    data.forEach(unit => {
      units[unit.id] = unit.unofficialName;
    });

    return res.status(200).json(units);
  } catch (err) {
    return res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
}

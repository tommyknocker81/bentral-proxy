export default async function handler(req, res) {
  const { from, to } = req.query;

  const propertyIds = [
    // Replace with real Bentral property IDs
    "5f5451794d6a674d",
    "5f5451794d6a6b4d",
    "5f5451794d7a634d"
  ];

  const headers = {
    "X-API-KEY": process.env.BENTRAL_API_KEY,
    "Content-Type": "application/json"
  };

  try {
    let allAvailableUnits = [];

    for (const propertyId of propertyIds) {
      const unitsRes = await fetch(
        `https://api.bentral.com/v1/properties/${propertyId}/units`,
        { headers }
      );
      const units = await unitsRes.json();

      for (const unit of units) {
        const unitId = unit.id;
        const detailsRes = await fetch(
          `https://api.bentral.com/v1/properties/${propertyId}/units/${unitId}?fields=availability&from=${from}&to=${to}`,
          { headers }
        );
        const details = await detailsRes.json();

        const isAvailable = details.availability?.every(
          (day) => day.status === "avail"
        );

        if (isAvailable) {
          allAvailableUnits.push({
            unitId,
            propertyId,
            name: unit.unofficialName || unit.officialName?.[0]?.title
          });
        }
      }
    }

    res.status(200).json(allAvailableUnits);
  } catch (error) {
    console.error("Fetch failed:", error);
    res.status(500).json({ error: "Internal error", message: error.message });
  }
}

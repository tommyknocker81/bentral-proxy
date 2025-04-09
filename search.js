export default async function handler(req, res) {
  const { from, to } = req.query;

  const headers = {
    "X-API-KEY": process.env.BENTRAL_API_KEY,
    "Content-Type": "application/json"
  };

  try {
    // Step 1: Retrieve the list of properties
    const propertiesRes = await fetch(`https://api.bentral.com/v1/properties`, { headers });
    const properties = await propertiesRes.json();

    let allAvailableUnits = [];

    // Step 2: Iterate over each property to get its units
    for (const property of properties) {
      const propertyId = property.id;

      // Retrieve units for the property
      const unitsRes = await fetch(`https://api.bentral.com/v1/properties/${propertyId}/units`, { headers });
      const units = await unitsRes.json();

      // Step 3: Check availability for each unit
      for (const unit of units) {
        const unitId = unit.id;

        const availabilityRes = await fetch(
          `https://api.bentral.com/v1/properties/${propertyId}/units/${unitId}?fields=availability&from=${from}&to=${to}`,
          { headers }
        );
        const availabilityData = await availabilityRes.json();

        // Determine if the unit is available for the entire date range
        const isAvailable = availabilityData.availability?.every(day => day.status === "avail");

        if (isAvailable) {
          allAvailableUnits.push({
            unitId,
            propertyId,
            name: unit.unofficial_name || unit.official_name?.[0]?.title
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

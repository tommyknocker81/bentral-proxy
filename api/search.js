import axios from "axios";

export default async function handler(req, res) {
  const { from, to } = req.query;

  const propertyIds = [
    // TODO: Replace with your real property IDs from Bentral
    "7a6a674d",
    "property-id-2",
    "property-id-3"
  ];

  const headers = {
    "X-API-KEY": process.env.BENTRAL_API_KEY
  };

  try {
    let allAvailableUnits = [];

    for (const propertyId of propertyIds) {
      const units = await axios.get(
        `https://api.bentral.com/v1/properties/${propertyId}/units`,
        { headers }
      );

      for (const unit of units.data) {
        const unitId = unit.id;

        const unitDetails = await axios.get(
          `https://api.bentral.com/v1/properties/${propertyId}/units/${unitId}?fields=availability&from=${from}&to=${to}`,
          { headers }
        );

        const availability = unitDetails.data.availability;

        const isAvailable = availability.every(
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
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
}

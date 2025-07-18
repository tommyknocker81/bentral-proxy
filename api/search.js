export default async function handler(req, res) {
  const { from, to, persons } = req.query;

  res.setHeader("Access-Control-Allow-Origin", "https://beatrice-eb443d-28e688c6164b9bfe20ae0ca.webflow.io"); // 👈 ADD THIS
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const headers = {
    "X-API-KEY": process.env.BENTRAL_API_KEY,
    "Content-Type": "application/json"
  };

  if (!from || !to || !persons) {
    return res.status(400).json({ error: "Missing required parameters: from, to, or persons" });
  }

  try {
    const searchUrl = `https://api.bentral.com/v1/properties/search?from=${from}&to=${to}&persons=${persons}`;
    const response = await fetch(searchUrl, { headers });
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching from Bentral:", error);
    res.status(500).json({ error: "Bentral API fetch failed", details: error.message });
  }
}

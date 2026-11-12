// api/search-rates.js
// Returns the same list as /api/search, plus a non-refundable price per unit.
//   amount        = flexible price (straight from Bentral search, unchanged)
//   nonref_amount = non-refundable price for the whole stay, or null if not bookable

const PROPERTY_ID = "5f6a41324d415f4e";

const ALLOWED_ORIGINS = [
  "https://www.resort-beatrice.si",
  "https://resort-beatrice.si"
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// All nights of the stay (check-out day not included)
function nightsBetween(from, to) {
  const nights = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d < end && nights.length < 60) {
    nights.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return nights;
}

// Days from today until the given date
function daysUntil(dateStr) {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.round((target - today) / 86400000);
}

// Price for the number of guests (if fewer guests than the smallest tier, use smallest tier)
function priceForPersons(prices, persons) {
  const tiers = prices
    .map(p => ({ persons: Number(p.persons), amount: Number(p.amount) }))
    .sort((a, b) => a.persons - b.persons);
  const tier = tiers.find(t => t.persons >= persons);
  return tier ? tier.amount : null;
}

// Total non-refundable price for the stay, or null if it can't be booked
function nonrefTotal(availability, nights, persons) {
  if (!Array.isArray(availability) || nights.length === 0) return null;

  let total = 0;

  for (let i = 0; i < nights.length; i++) {
    const day = availability.find(a => a.date === nights[i]);
    if (!day || day.status !== "avail") return null;

    const rate = (day.rates || []).find(r => r.policy === "nonref");
    if (!rate || rate.closed) return null;
    if (!(rate.channels || []).includes("web")) return null;

    // Rules checked on the arrival night
    if (i === 0) {
      if (rate.closeOnArrival) return null;
      if (nights.length < Number(rate.minLengthStay || 0)) return null;
      if (daysUntil(nights[0]) < Number(rate.minAdvance || 0)) return null;
    }

    let price = priceForPersons(rate.prices || [], persons);
    if (price === null || isNaN(price)) return null;

    // Website discount (e.g. -10%)
    const adj = rate.channel_adjustment && rate.channel_adjustment.web;
    if (adj) {
      if (adj.unit !== "percent") return null; // unknown type: don't guess a price
      price = price * (1 + Number(adj.amount) / 100);
    }

    total += price;
  }

  return total.toFixed(2);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { from, to } = req.query;
  const persons = parseInt(req.query.persons, 10);

  if (!DATE_RE.test(from || "") || !DATE_RE.test(to || "") || !persons || persons < 1) {
    return res.status(400).json({
      error: "Use from=YYYY-MM-DD&to=YYYY-MM-DD&persons=number"
    });
  }

  const nights = nightsBetween(from, to);
  if (nights.length === 0) {
    return res.status(400).json({ error: "Check-out must be after check-in" });
  }

  const headers = { "X-API-KEY": process.env.BENTRAL_API_KEY };

  try {
    // 1. Normal search (flexible prices) - same call as /api/search
    const searchRes = await fetch(
      `https://api.bentral.com/v1/properties/search?from=${from}&to=${to}&persons=${persons}`,
      { headers }
    );
    const results = await searchRes.json();

    if (!searchRes.ok || !Array.isArray(results)) {
      return res.status(502).json({ error: "Bentral search failed", raw: results });
    }

    // 2. For each suitable unit, fetch details and work out the non-refundable price
    const enriched = await Promise.all(
      results.map(async unit => {
        let nonref_amount = null;

        if (!unit.warning || unit.warning.length === 0) {
          try {
            const url =
              `https://api.bentral.com/v1/properties/${unit.property_id || PROPERTY_ID}` +
              `/units/${unit.unit_id}?fields=id,availability&from=${from}&to=${to}`;
            const r = await fetch(url, { headers });
            if (r.ok) {
              const detail = await r.json();
              nonref_amount = nonrefTotal(detail.availability, nights, persons);
            }
          } catch (e) {
            // If details fail, just show the flexible price
          }
        }

        // Apply the same promotion Bentral applied to the flexible price
        // (e.g. "last_minute" -18%). Percentage promotions only; for any other
        // type we can't be sure, so we hide the non-refundable price.
        const disc = unit.discount || {};
        if (nonref_amount !== null && (disc.percentage || disc.amount)) {
          const pct = Number(disc.percentage);
          if (disc.percentage && !isNaN(pct)) {
            nonref_amount = (Number(nonref_amount) * (1 - pct / 100)).toFixed(2);
          } else {
            nonref_amount = null;
          }
        }

        // Lowest price to show on the listing:
        // non-refundable if it exists and is cheaper, otherwise flexible
        const flexible = Number(unit.amount);
        const nonref = nonref_amount !== null ? Number(nonref_amount) : null;
        const useNonref = nonref !== null && nonref < flexible;

        return {
          ...unit,
          nonref_amount,
          lowest_amount: useNonref ? nonref_amount : unit.amount,
          lowest_policy: useNonref ? "nonref" : "std"
        };
      })
    );

    return res.status(200).json(enriched);
  } catch (error) {
    console.error("Error fetching from Bentral:", error);
    return res.status(500).json({ error: "Bentral API fetch failed", details: error.message });
  }
}

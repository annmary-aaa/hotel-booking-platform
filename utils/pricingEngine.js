// Computes the total stay price by walking night-by-night through the stay,
// applying the highest-priority applicable multiplier for each night:
// an active seasonal rule covering that date, otherwise a weekend rule if
// the night falls on Friday/Saturday, otherwise the room type's base price.
function getNightlyRate(basePrice, date, pricingRules) {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  const isWeekendNight = day === 5 || day === 6; // Fri or Sat night

  const seasonalRule = pricingRules.find(
    (r) =>
      r.isActive &&
      r.ruleType === 'seasonal' &&
      r.startDate &&
      r.endDate &&
      date >= new Date(r.startDate) &&
      date <= new Date(r.endDate)
  );
  if (seasonalRule) return basePrice * seasonalRule.multiplier;

  if (isWeekendNight) {
    const weekendRule = pricingRules.find((r) => r.isActive && r.ruleType === 'weekend');
    if (weekendRule) return basePrice * weekendRule.multiplier;
  }

  return basePrice;
}

function calculateStayPrice({ basePrice, checkIn, checkOut, numRooms = 1, pricingRules = [] }) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  let nights = 0;
  let baseAmount = 0;

  const cursor = new Date(start);
  while (cursor < end) {
    const rate = getNightlyRate(basePrice, cursor, pricingRules);
    baseAmount += rate;
    nights += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  baseAmount *= numRooms;

  const taxRate = parseFloat(process.env.TAX_RATE) || 0.12;
  const taxAmount = Math.round(baseAmount * taxRate * 100) / 100;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

  return {
    nights,
    baseAmount: Math.round(baseAmount * 100) / 100,
    taxAmount,
    totalAmount,
    taxRate,
  };
}

module.exports = { calculateStayPrice, getNightlyRate };

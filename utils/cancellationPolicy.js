// Refund tiers based on how many days remain before check-in at the moment
// of cancellation:
//   7+ days out   -> 100% refund
//   3-6 days out  -> 50% refund
//   < 3 days out  -> 0% refund (non-refundable window)
// Cancelling a booking that has already been checked in / checked out is
// never allowed (enforced by the controller, not here).
function getRefundPercentage(checkInDate, now = new Date()) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilCheckIn = Math.ceil((new Date(checkInDate) - now) / msPerDay);

  if (daysUntilCheckIn >= 7) return 100;
  if (daysUntilCheckIn >= 3) return 50;
  return 0;
}

function calculateRefund(totalAmount, checkInDate, now = new Date()) {
  const refundPercentage = getRefundPercentage(checkInDate, now);
  const refundAmount = Math.round(((totalAmount * refundPercentage) / 100) * 100) / 100;
  return { refundPercentage, refundAmount };
}

module.exports = { getRefundPercentage, calculateRefund };

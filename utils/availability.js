const Booking = require('../models/Booking');

// Active booking statuses that hold inventory (reserved/confirmed/checked_in
// all block rooms; checked_out and cancelled free them up again).
const ACTIVE_STATUSES = ['reserved', 'confirmed', 'checked_in'];

// Counts how many rooms of a given room type are already committed
// (numRooms summed) for bookings whose date range overlaps [checkIn, checkOut).
async function getBookedRoomCount(roomTypeId, checkIn, checkOut) {
  const overlapping = await Booking.find({
    roomTypeId,
    status: { $in: ACTIVE_STATUSES },
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
  }).select('numRooms');

  return overlapping.reduce((sum, b) => sum + (b.numRooms || 1), 0);
}

// Returns how many rooms of this room type remain available for the given
// date range (prevents double-booking).
async function getAvailableCount(roomType, checkIn, checkOut) {
  const booked = await getBookedRoomCount(roomType._id, checkIn, checkOut);
  return Math.max(roomType.totalRooms - booked, 0);
}

module.exports = { getBookedRoomCount, getAvailableCount, ACTIVE_STATUSES };

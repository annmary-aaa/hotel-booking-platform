const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ACTIVE_STATUSES } = require('../utils/availability');

// GET /api/admin/reports/occupancy?hotelId=&from=&to=  (admin/staff)
const getOccupancyReport = asyncHandler(async (req, res) => {
  const { hotelId } = req.query;
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const to = req.query.to
    ? new Date(req.query.to)
    : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000); // default 30-day window

  const hotelFilter = { isActive: true };
  if (hotelId) hotelFilter._id = hotelId;
  const hotels = await Hotel.find(hotelFilter);

  const report = [];
  for (const hotel of hotels) {
    const roomTypes = await RoomType.find({ hotelId: hotel._id });
    const totalRooms = roomTypes.reduce((sum, rt) => sum + rt.totalRooms, 0);
    const totalRoomNights = totalRooms * Math.max(Math.ceil((to - from) / (1000 * 60 * 60 * 24)), 1);

    const bookings = await Booking.find({
      hotelId: hotel._id,
      status: { $in: [...ACTIVE_STATUSES, 'checked_out'] },
      checkIn: { $lt: to },
      checkOut: { $gt: from },
    });

    let bookedRoomNights = 0;
    let revenue = 0;
    for (const b of bookings) {
      const overlapStart = new Date(Math.max(new Date(b.checkIn), from));
      const overlapEnd = new Date(Math.min(new Date(b.checkOut), to));
      const overlapNights = Math.max(
        Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)),
        0
      );
      bookedRoomNights += overlapNights * b.numRooms;
      revenue += b.totalAmount;
    }

    const occupancyRate = totalRoomNights > 0 ? (bookedRoomNights / totalRoomNights) * 100 : 0;

    report.push({
      hotel: { _id: hotel._id, name: hotel.name, city: hotel.city },
      totalRooms,
      periodFrom: from,
      periodTo: to,
      bookedRoomNights,
      totalRoomNights,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      totalRevenue: Math.round(revenue * 100) / 100,
      totalBookings: bookings.length,
    });
  }

  res.status(200).json({ success: true, message: 'OK', data: report });
});

module.exports = { getOccupancyReport };

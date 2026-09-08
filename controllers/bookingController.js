const Booking = require('../models/Booking');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const Hotel = require('../models/Hotel');
const PricingRule = require('../models/PricingRule');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getAvailableCount } = require('../utils/availability');
const { calculateStayPrice } = require('../utils/pricingEngine');
const { calculateRefund } = require('../utils/cancellationPolicy');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

// Loads a booking and throws 404 if missing. Also enforces that a guest can
// only act on their own booking; staff/admin may act on any booking.
async function loadBookingWithOwnershipCheck(bookingId, user) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.', 'NOT_FOUND');

  if (user.role === 'guest' && String(booking.guestId) !== String(user.id)) {
    throw new ApiError(403, 'You can only access your own bookings.', 'FORBIDDEN');
  }
  return booking;
}

// POST /api/bookings  (guest) - Module 5: Reservation Booking Workflow
const createBooking = asyncHandler(async (req, res) => {
  const { hotelId, roomTypeId, checkIn, checkOut, numGuests, numRooms } = req.body;

  const [hotel, roomType] = await Promise.all([
    Hotel.findById(hotelId),
    RoomType.findById(roomTypeId),
  ]);
  if (!hotel) throw new ApiError(404, 'Hotel not found.', 'NOT_FOUND');
  if (!roomType || String(roomType.hotelId) !== String(hotelId)) {
    throw new ApiError(404, 'Room type not found for this hotel.', 'NOT_FOUND');
  }
  if (numGuests > roomType.capacity * numRooms) {
    throw new ApiError(
      400,
      `Room type capacity (${roomType.capacity}/room) cannot accommodate ${numGuests} guests across ${numRooms} room(s).`,
      'VALIDATION_ERROR'
    );
  }

  // Business-rule check: prevent double-booking by validating live availability.
  const available = await getAvailableCount(roomType, checkIn, checkOut);
  if (available < numRooms) {
    throw new ApiError(
      409,
      `Only ${available} room(s) of this type are available for the selected dates.`,
      'AVAILABILITY_CONFLICT'
    );
  }

  const pricingRules = await PricingRule.find({ roomTypeId, isActive: true });
  const { baseAmount, taxAmount, totalAmount } = calculateStayPrice({
    basePrice: roomType.basePrice,
    checkIn,
    checkOut,
    numRooms,
    pricingRules,
  });

  const booking = await Booking.create({
    guestId: req.user.id,
    hotelId,
    roomTypeId,
    checkIn,
    checkOut,
    numGuests,
    numRooms,
    baseAmount,
    taxAmount,
    totalAmount,
    status: 'reserved',
    statusHistory: [{ status: 'reserved', changedBy: req.user.id, note: 'Booking created' }],
  });

  res.status(201).json({ success: true, message: 'Record created successfully', data: booking });
});

// GET /api/bookings  (staff/admin) - list all bookings with filters
const listAllBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.hotelId) filter.hotelId = req.query.hotelId;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('guestId', 'name email')
      .populate('hotelId', 'name city')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  res
    .status(200)
    .json({ success: true, message: 'OK', data: buildPaginatedResponse(bookings, total, page, limit) });
});

// GET /api/guests/:id/bookings - Module 11: Guest Booking History
const getGuestBookingHistory = asyncHandler(async (req, res) => {
  if (req.user.role === 'guest' && req.user.id !== req.params.id) {
    throw new ApiError(403, 'You can only view your own booking history.', 'FORBIDDEN');
  }

  const bookings = await Booking.find({ guestId: req.params.id })
    .populate('hotelId', 'name city')
    .populate('roomTypeId', 'name')
    .sort({ checkIn: -1 });

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.checkOut) >= now && b.status !== 'cancelled');
  const past = bookings.filter((b) => new Date(b.checkOut) < now || b.status === 'cancelled');

  res.status(200).json({ success: true, message: 'OK', data: { upcoming, past } });
});

// GET /api/bookings/:id
const getBooking = asyncHandler(async (req, res) => {
  const booking = await loadBookingWithOwnershipCheck(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'OK', data: booking });
});

// PUT /api/bookings/:id/confirm  (staff/admin) - Module 7: Booking Status Management
const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.', 'NOT_FOUND');

  if (booking.status !== 'reserved') {
    throw new ApiError(
      409,
      `Cannot confirm a booking with status '${booking.status}'.`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  booking.status = 'confirmed';
  booking.statusHistory.push({ status: 'confirmed', changedBy: req.user.id });
  await booking.save();

  res.status(200).json({ success: true, message: 'Status updated successfully', data: booking });
});

// PUT /api/bookings/:id/checkin  (staff) - Module 8: Check-in / Check-out Module
const checkinBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.', 'NOT_FOUND');

  if (!['reserved', 'confirmed'].includes(booking.status)) {
    throw new ApiError(
      409,
      `Cannot check in a booking with status '${booking.status}'.`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const room = await Room.findById(req.body.roomId);
  if (!room || String(room.roomTypeId) !== String(booking.roomTypeId)) {
    throw new ApiError(404, 'Room not found for this booking\'s room type.', 'NOT_FOUND');
  }
  if (!['clean', 'inspected'].includes(room.housekeepingStatus)) {
    throw new ApiError(
      409,
      `Room ${room.roomNumber} is not ready for check-in (housekeeping status: ${room.housekeepingStatus}).`,
      'ROOM_NOT_READY'
    );
  }

  booking.status = 'checked_in';
  booking.roomId = room._id;
  booking.actualCheckIn = new Date();
  booking.statusHistory.push({
    status: 'checked_in',
    changedBy: req.user.id,
    note: `Assigned room ${room.roomNumber}`,
  });
  await booking.save();

  res.status(200).json({ success: true, message: 'Status updated successfully', data: booking });
});

// PUT /api/bookings/:id/checkout  (staff) - Module 8: Check-in / Check-out Module
const checkoutBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found.', 'NOT_FOUND');

  if (booking.status !== 'checked_in') {
    throw new ApiError(
      409,
      `Cannot check out a booking with status '${booking.status}'.`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  booking.status = 'checked_out';
  booking.actualCheckOut = new Date();
  booking.statusHistory.push({ status: 'checked_out', changedBy: req.user.id });
  await booking.save();

  // Room now needs cleaning before its next guest.
  if (booking.roomId) {
    await Room.findByIdAndUpdate(booking.roomId, { housekeepingStatus: 'dirty' });
  }

  res.status(200).json({ success: true, message: 'Status updated successfully', data: booking });
});

// PUT /api/bookings/:id/cancel  (guest own / staff / admin) - Module 10: Cancellation & Refund Policy Engine
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await loadBookingWithOwnershipCheck(req.params.id, req.user);

  if (['checked_in', 'checked_out', 'cancelled'].includes(booking.status)) {
    throw new ApiError(
      409,
      `Cannot cancel a booking with status '${booking.status}'.`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const { refundPercentage, refundAmount } = calculateRefund(booking.totalAmount, booking.checkIn);

  booking.status = 'cancelled';
  booking.cancellation = {
    isCancelled: true,
    cancelledAt: new Date(),
    refundPercentage,
    refundAmount,
    reason: req.body.reason || '',
  };
  booking.statusHistory.push({
    status: 'cancelled',
    changedBy: req.user.id,
    note: req.body.reason || 'Cancelled by user',
  });
  await booking.save();

  res.status(200).json({ success: true, message: 'Status updated successfully', data: booking });
});

// GET /api/bookings/:id/invoice - Module 12: Invoice Generation Summary
const getInvoice = asyncHandler(async (req, res) => {
  const booking = await loadBookingWithOwnershipCheck(req.params.id, req.user);
  const [hotel, roomType] = await Promise.all([
    Hotel.findById(booking.hotelId),
    RoomType.findById(booking.roomTypeId),
  ]);

  const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));

  const invoice = {
    bookingId: booking._id,
    hotel: hotel ? { name: hotel.name, city: hotel.city } : null,
    roomType: roomType ? { name: roomType.name } : null,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights,
    numRooms: booking.numRooms,
    numGuests: booking.numGuests,
    baseAmount: booking.baseAmount,
    taxAmount: booking.taxAmount,
    totalAmount: booking.totalAmount,
    status: booking.status,
    cancellation: booking.cancellation.isCancelled ? booking.cancellation : undefined,
    amountDue: booking.cancellation.isCancelled
      ? Math.max(booking.totalAmount - booking.cancellation.refundAmount, 0)
      : booking.totalAmount,
  };

  res.status(200).json({ success: true, message: 'OK', data: invoice });
});

module.exports = {
  createBooking,
  listAllBookings,
  getGuestBookingHistory,
  getBooking,
  confirmBooking,
  checkinBooking,
  checkoutBooking,
  cancelBooking,
  getInvoice,
};

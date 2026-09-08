const Hotel = require('../models/Hotel');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');

// POST /api/hotels  (admin only)
const createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, message: 'Record created successfully', data: hotel });
});

// GET /api/hotels  (public/guest browsing, with optional city filter + pagination)
const listHotels = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { isActive: true };
  if (req.query.city) filter.city = new RegExp(req.query.city, 'i');

  const [hotels, total] = await Promise.all([
    Hotel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Hotel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: 'OK',
    data: buildPaginatedResponse(hotels, total, page, limit),
  });
});

// GET /api/hotels/:id
const getHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) throw new ApiError(404, 'Hotel not found.', 'NOT_FOUND');
  res.status(200).json({ success: true, message: 'OK', data: hotel });
});

// PUT /api/hotels/:id  (admin only)
const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!hotel) throw new ApiError(404, 'Hotel not found.', 'NOT_FOUND');
  res.status(200).json({ success: true, message: 'Status updated successfully', data: hotel });
});

// DELETE /api/hotels/:id  (admin only) - soft delete
const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!hotel) throw new ApiError(404, 'Hotel not found.', 'NOT_FOUND');
  res.status(200).json({ success: true, message: 'Hotel deactivated successfully', data: hotel });
});

module.exports = { createHotel, listHotels, getHotel, updateHotel, deleteHotel };

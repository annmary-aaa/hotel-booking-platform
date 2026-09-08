const RoomType = require('../models/RoomType');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/room-types  (admin only)
const createRoomType = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.body.hotelId);
  if (!hotel) throw new ApiError(404, 'Hotel not found for hotelId.', 'NOT_FOUND');

  const roomType = await RoomType.create(req.body);

  // Auto-generate the physical room inventory (Room documents) so
  // housekeeping/check-in workflows have real rooms to operate on.
  const roomsToCreate = [];
  for (let i = 1; i <= roomType.totalRooms; i += 1) {
    roomsToCreate.push({
      roomTypeId: roomType._id,
      roomNumber: `${roomType.name.slice(0, 1).toUpperCase()}${String(i).padStart(3, '0')}`,
    });
  }
  await Room.insertMany(roomsToCreate);

  res.status(201).json({ success: true, message: 'Record created successfully', data: roomType });
});

// GET /api/room-types?hotelId=...
const listRoomTypes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.hotelId) filter.hotelId = req.query.hotelId;
  const roomTypes = await RoomType.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, message: 'OK', data: roomTypes });
});

// GET /api/room-types/:id
const getRoomType = asyncHandler(async (req, res) => {
  const roomType = await RoomType.findById(req.params.id);
  if (!roomType) throw new ApiError(404, 'Room type not found.', 'NOT_FOUND');
  res.status(200).json({ success: true, message: 'OK', data: roomType });
});

// PUT /api/room-types/:id  (admin only)
const updateRoomType = asyncHandler(async (req, res) => {
  const roomType = await RoomType.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!roomType) throw new ApiError(404, 'Room type not found.', 'NOT_FOUND');
  res
    .status(200)
    .json({ success: true, message: 'Status updated successfully', data: roomType });
});

// DELETE /api/room-types/:id  (admin only)
const deleteRoomType = asyncHandler(async (req, res) => {
  const roomType = await RoomType.findById(req.params.id);
  if (!roomType) throw new ApiError(404, 'Room type not found.', 'NOT_FOUND');
  await roomType.deleteOne();
  await Room.deleteMany({ roomTypeId: roomType._id });
  res.status(200).json({ success: true, message: 'Room type deleted successfully', data: {} });
});

module.exports = { createRoomType, listRoomTypes, getRoomType, updateRoomType, deleteRoomType };

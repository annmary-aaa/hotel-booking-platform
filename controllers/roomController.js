const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/rooms  (admin only) - add an extra physical room to a room type
const createRoom = asyncHandler(async (req, res) => {
  const roomType = await RoomType.findById(req.body.roomTypeId);
  if (!roomType) throw new ApiError(404, 'Room type not found.', 'NOT_FOUND');

  const room = await Room.create(req.body);
  roomType.totalRooms += 1;
  await roomType.save();

  res.status(201).json({ success: true, message: 'Record created successfully', data: room });
});

// GET /api/rooms?roomTypeId=...&housekeepingStatus=...
const listRooms = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.roomTypeId) filter.roomTypeId = req.query.roomTypeId;
  if (req.query.housekeepingStatus) filter.housekeepingStatus = req.query.housekeepingStatus;
  const rooms = await Room.find(filter).sort({ roomNumber: 1 });
  res.status(200).json({ success: true, message: 'OK', data: rooms });
});

// PUT /api/rooms/:id/housekeeping  (staff only)
const updateHousekeepingStatus = asyncHandler(async (req, res) => {
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { housekeepingStatus: req.body.housekeepingStatus },
    { new: true, runValidators: true }
  );
  if (!room) throw new ApiError(404, 'Room not found.', 'NOT_FOUND');
  res.status(200).json({ success: true, message: 'Status updated successfully', data: room });
});

module.exports = { createRoom, listRooms, updateHousekeepingStatus };

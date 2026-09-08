const mongoose = require('mongoose');

// Referenced to RoomType: rooms are numerous, updated independently
// (housekeeping status changes constantly, separate from room type pricing/config).
const roomSchema = new mongoose.Schema(
  {
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number },
    housekeepingStatus: {
      type: String,
      enum: ['clean', 'dirty', 'inspected', 'out_of_service'],
      default: 'clean',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ roomTypeId: 1 });
roomSchema.index({ roomTypeId: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);

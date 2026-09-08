const mongoose = require('mongoose');

// Referenced to Hotel: many room types belong to one hotel, and room types
// are queried/updated independently of the parent hotel document.
const roomTypeSchema = new mongoose.Schema(
  {
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    name: { type: String, required: true, trim: true }, // e.g. "Deluxe", "Suite"
    description: { type: String, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    totalRooms: { type: Number, required: true, min: 1 },
    capacity: { type: Number, required: true, min: 1 }, // max guests per room
    amenities: { type: [String], default: [] },
  },
  { timestamps: true }
);

roomTypeSchema.index({ hotelId: 1 });

module.exports = mongoose.model('RoomType', roomTypeSchema);

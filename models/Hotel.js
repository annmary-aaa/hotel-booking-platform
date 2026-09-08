const mongoose = require('mongoose');

// Design note: amenities is embedded (small array of strings, always read
// with the parent hotel, never queried/updated independently).
// createdBy is referenced (points to a User; large, independently managed collection).
const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    amenities: { type: [String], default: [] },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

hotelSchema.index({ name: 1 });
hotelSchema.index({ city: 1 });

module.exports = mongoose.model('Hotel', hotelSchema);

const mongoose = require('mongoose');

// Design note:
// - guestId, hotelId, roomTypeId, roomId are REFERENCED: each points to a large,
//   independently-managed collection shared across many bookings.
// - statusHistory is EMBEDDED: small sub-documents that are always read together
//   with the parent booking and never queried on their own.
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null }, // assigned at check-in

    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    numGuests: { type: Number, required: true, min: 1, default: 1 },
    numRooms: { type: Number, required: true, min: 1, default: 1 },

    status: {
      type: String,
      enum: ['reserved', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
      default: 'reserved',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    actualCheckIn: { type: Date, default: null },
    actualCheckOut: { type: Date, default: null },

    baseAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledAt: { type: Date, default: null },
      refundPercentage: { type: Number, default: 0 },
      refundAmount: { type: Number, default: 0 },
      reason: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ guestId: 1 });
bookingSchema.index({ hotelId: 1, roomTypeId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

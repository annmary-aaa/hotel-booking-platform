const Joi = require('joi');

const createBooking = Joi.object({
  hotelId: Joi.string().hex().length(24).required(),
  roomTypeId: Joi.string().hex().length(24).required(),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
  numGuests: Joi.number().integer().min(1).default(1),
  numRooms: Joi.number().integer().min(1).default(1),
});

const cancelBooking = Joi.object({
  reason: Joi.string().max(300).allow('', null),
});

const checkinBooking = Joi.object({
  roomId: Joi.string().hex().length(24).required(),
});

const searchAvailability = Joi.object({
  hotelId: Joi.string().hex().length(24),
  city: Joi.string().max(100),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
  occupancy: Joi.number().integer().min(1).default(1),
});

module.exports = { createBooking, cancelBooking, checkinBooking, searchAvailability };

const Joi = require('joi');

const createRoomType = Joi.object({
  hotelId: Joi.string().hex().length(24).required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  basePrice: Joi.number().min(0).required(),
  totalRooms: Joi.number().integer().min(1).required(),
  capacity: Joi.number().integer().min(1).required(),
  amenities: Joi.array().items(Joi.string().max(50)).default([]),
});

const updateRoomType = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500).allow('', null),
  basePrice: Joi.number().min(0),
  totalRooms: Joi.number().integer().min(1),
  capacity: Joi.number().integer().min(1),
  amenities: Joi.array().items(Joi.string().max(50)),
}).min(1);

const createRoom = Joi.object({
  roomTypeId: Joi.string().hex().length(24).required(),
  roomNumber: Joi.string().min(1).max(20).required(),
  floor: Joi.number().integer(),
});

const updateHousekeeping = Joi.object({
  housekeepingStatus: Joi.string()
    .valid('clean', 'dirty', 'inspected', 'out_of_service')
    .required(),
});

module.exports = { createRoomType, updateRoomType, createRoom, updateHousekeeping };

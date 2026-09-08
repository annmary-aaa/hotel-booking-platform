const Joi = require('joi');

const createHotel = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  city: Joi.string().min(2).max(100).required(),
  address: Joi.string().max(300).allow('', null),
  amenities: Joi.array().items(Joi.string().max(50)).default([]),
  rating: Joi.number().min(0).max(5).default(0),
});

const updateHotel = Joi.object({
  name: Joi.string().min(2).max(150),
  city: Joi.string().min(2).max(100),
  address: Joi.string().max(300).allow('', null),
  amenities: Joi.array().items(Joi.string().max(50)),
  rating: Joi.number().min(0).max(5),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createHotel, updateHotel };

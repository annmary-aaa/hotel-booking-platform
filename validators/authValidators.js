const Joi = require('joi');

const register = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(72).required(),
  phone: Joi.string().max(20).allow('', null),
  role: Joi.string().valid('guest', 'staff', 'admin').default('guest'),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { register, login };

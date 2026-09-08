const Joi = require('joi');

const createPricingRule = Joi.object({
  roomTypeId: Joi.string().hex().length(24).required(),
  season: Joi.string().min(2).max(100).required(),
  ruleType: Joi.string().valid('seasonal', 'weekend').default('seasonal'),
  startDate: Joi.date().iso().when('ruleType', { is: 'seasonal', then: Joi.required() }),
  endDate: Joi.date()
    .iso()
    .when('ruleType', { is: 'seasonal', then: Joi.required() })
    .greater(Joi.ref('startDate')),
  multiplier: Joi.number().min(0.1).required(),
});

const updatePricingRule = Joi.object({
  season: Joi.string().min(2).max(100),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  multiplier: Joi.number().min(0.1),
  isActive: Joi.boolean(),
}).min(1);

module.exports = { createPricingRule, updatePricingRule };

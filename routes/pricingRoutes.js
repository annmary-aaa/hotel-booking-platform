const express = require('express');
const router = express.Router();
const {
  createPricingRule,
  listPricingRules,
  updatePricingRule,
  deletePricingRule,
} = require('../controllers/pricingController');
const validate = require('../middleware/validate');
const {
  createPricingRule: createSchema,
  updatePricingRule: updateSchema,
} = require('../validators/pricingValidators');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('admin'), validate(createSchema), createPricingRule);
router.get('/', listPricingRules);
router.put('/:id', protect, authorize('admin'), validate(updateSchema), updatePricingRule);
router.delete('/:id', protect, authorize('admin'), deletePricingRule);

module.exports = router;

const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { register: registerSchema, login: loginSchema } = require('../validators/authValidators');
const { protect } = require('../middleware/auth');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

module.exports = router;

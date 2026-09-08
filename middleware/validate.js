const ApiError = require('../utils/ApiError');

// Generic validator factory: validate(schema) returns Express middleware
// that checks req.body (or req.query if source === 'query') against a Joi schema.
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((d) => d.message).join('; ');
    throw new ApiError(400, message, 'VALIDATION_ERROR');
  }

  req[source] = value;
  next();
};

module.exports = validate;

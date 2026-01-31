const { validationResult } = require('express-validator');

/**
 * Validation Middleware
 * Handles validation errors from express-validator
 */

// Middleware to handle validation errors from express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

module.exports = validate;

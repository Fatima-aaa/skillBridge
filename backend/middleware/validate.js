const { validationResult } = require('express-validator');

// Middleware to handle validation errors from express-validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    return res.status(400).json({
      success: false,
      error: messages.join('. '),
    });
  }
  next();
};

module.exports = validate;

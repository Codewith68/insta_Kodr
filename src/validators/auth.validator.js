import { body, validationResult } from "express-validator";

export const validate = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  next();
};

const passwordValidator = body("password")
  .notEmpty()
  .withMessage("Password is required")
  .isLength({ min: 5, max: 20 })
  .withMessage("Password must be between 5 and 20 characters long")
  .custom((value) => {
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(value);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new Error(
        "Password must contain at least one uppercase, one lowercase, one number, and one special character",
      );
    }

    return true;
  });

export const registerValidator = [
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 5, max: 20 })
    .withMessage("Username must be between 5 and 20 characters long"),

  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),

  passwordValidator,

  body("fullname")
    .notEmpty()
    .withMessage("Fullname is required")
    .isString()
    .withMessage("Fullname must be a string")
    .isLength({ min: 5, max: 20 })
    .withMessage("Fullname must be between 5 and 20 characters long"),

  validate,
];

export const loginValidator = [
  body("username").optional().notEmpty().withMessage("Username is required").isString().withMessage("Username must be a string"),

  body("email").optional().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),

  passwordValidator,

  validate,
];

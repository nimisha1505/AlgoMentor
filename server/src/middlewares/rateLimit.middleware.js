import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  validate: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  validate: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const analysisLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many analysis requests. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },
});

const followUpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many follow-up requests. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },
});

const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many import attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },
});

export { loginLimiter, registerLimiter, analysisLimiter, followUpLimiter, importLimiter };
export default loginLimiter;

import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development';
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
  windowMs: isDev ? 2 * 60 * 1000 : 60 * 60 * 1000,
  max: isDev ? 20 : 5,
  skip: () => isTest,
  validate: false,
  message: {
    success: false,
    message: isDev
      ? 'Too many registration attempts. Please wait 2 minutes.'
      : 'Too many registration attempts. Please try again later.',
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

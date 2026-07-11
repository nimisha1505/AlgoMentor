import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware to verify JSON Web Token (JWT) sent in request cookies.
 * Extracts, validates the token, fetches the user, and attaches them to req.user.
 */
const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    throw new ApiError(401, 'Unauthorized request');
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  const user = await User.findById(decodedToken?._id).select(
    '-password -refreshToken'
  );

  if (!user) {
    throw new ApiError(401, 'Invalid access token');
  }

  req.user = user;
  next();
});

export { verifyJWT };

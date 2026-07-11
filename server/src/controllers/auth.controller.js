import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Register a new user in the platform.
 * Validates uniqueness of email and username, creates user, and returns safe user data.
 */
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;

  // Check if user already exists with the same email or username
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, 'Email is already registered');
    }
    throw new ApiError(409, 'Username is already taken');
  }

  // Create user database entry
  const newUser = await User.create({
    fullName,
    username,
    email,
    password,
  });

  // Fetch the created user excluding password and refreshToken fields
  const createdUser = await User.findById(newUser._id).select(
    '-password -refreshToken'
  );

  if (!createdUser) {
    throw new ApiError(500, 'User registration failed');
  }

  // Return formatted JSON success response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

export { registerUser };

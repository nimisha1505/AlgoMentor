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

/**
 * Log in an existing user.
 * Validates credentials, sets accessToken/refreshToken HTTP-only cookies, and returns safe user data.
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email and explicitly select password and refreshToken (since select: false is set in schema)
  const user = await User.findOne({ email }).select('+password +refreshToken');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Verify the password using model instance method
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token to user document
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Get user info excluding password and refresh token
  const safeUser = await User.findById(user._id).select('-password -refreshToken');

  // Shared cookie configurations
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: safeUser },
        'User logged in successfully'
      )
    );
});

/**
 * Log out a user.
 * Clears access and refresh tokens from cookies and user document.
 */
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: '',
      },
    },
    { new: true }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

export { registerUser, loginUser, logoutUser };

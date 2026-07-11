import axiosClient from './axiosClient.js';

/**
 * Register a new user account.
 */
const registerUser = async ({ fullName, username, email, password }) => {
  const response = await axiosClient.post('/auth/register', {
    fullName,
    username,
    email,
    password,
  });
  return response.data.data;
};

/**
 * Log in a user.
 */
const loginUser = async ({ email, password }) => {
  const response = await axiosClient.post('/auth/login', {
    email,
    password,
  });
  return response.data.data;
};

/**
 * Log out the currently authenticated user.
 */
const logoutUser = async () => {
  const response = await axiosClient.post('/auth/logout');
  return response.data;
};

/**
 * Fetch the currently authenticated user details.
 */
const getCurrentUser = async () => {
  const response = await axiosClient.get('/auth/current-user');
  return response.data.data.user;
};

export { registerUser, loginUser, logoutUser, getCurrentUser };
